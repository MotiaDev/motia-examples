config = {
    'type': 'event',
    'name': 'Email Analyzer',
    'description': 'Analyzes email content using Hugging Face models to determine category, urgency, and importance',
    'subscribes': ['gmail.email.fetched'],
    'emits': [{
        'topic': 'gmail.email.analyzed',
        'label': 'Email Analyzed',
    }],
    'flows': ['gmail-flow']
}

import os
import re
from huggingface_hub import InferenceClient
from datetime import datetime, timedelta
from transformers import pipeline

HF_TOKEN = os.environ.get('HUGGINGFACE_API_TOKEN')
if not HF_TOKEN:
    print("Warning: HUGGINGFACE_API_TOKEN environment variable not set")

client = InferenceClient(token=HF_TOKEN)

# Define model endpoints
CATEGORY_MODEL = "facebook/bart-large-mnli"  # For zero-shot classification
URGENCY_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"  # For sentiment analysis

classifier = pipeline("zero-shot-classification",
                      model=CATEGORY_MODEL)

# Refined email categories with subcategories for better classification
EMAIL_CATEGORIES = [
    "work.task", "work.meeting", "work.update",
    "personal.finance", "personal.health", "personal.family",
    "social.event", "social.networking",
    "promotion.marketing", "promotion.discount", "promotion.newsletter",
    "update.newsletter", "update.notification",
    "spam"
]

# Enhanced keywords specifically for detecting promotional emails with higher precision
PROMOTION_KEYWORDS = {
    "discount": 1.0, "sale": 1.0, "offer": 0.9, "promo": 0.9,
    "limited time": 0.8, "exclusive": 0.8, "off": 0.7, "deal": 0.7,
    "subscribe": 0.6, "unsubscribe": 0.6, "newsletter": 0.6,
    "marketing": 0.5, "advertisement": 0.5, "coupon": 0.5
}

# Expanded domain list for common promotional email senders
PROMOTIONAL_DOMAINS = [
    "marketing", "newsletter", "news", "offers", "info", "noreply",
    "promotions", "deals", "sales", "updates", "notifications"
]

# Expanded urgent words and phrases with weighted importance
URGENCY_KEYWORDS = {
    "critical": 1.0, "emergency": 1.0, "urgent": 0.9, "asap": 0.9,
    "immediately": 0.8, "deadline": 0.8, "time-sensitive": 0.7,
    "action required": 0.7, "important": 0.6, "priority": 0.6,
    "quick": 0.5, "fast": 0.5, "soon": 0.4, "reminder": 0.3
}

# Phrases that often indicate low urgency
LOW_URGENCY_PHRASES = [
    "no rush", "when you have time", "at your convenience",
    "fyi", "for your information", "update only", "just letting you know"
]

# Keywords that might indicate message importance
VIP_SENDERS = ["boss", "ceo", "director", "manager", "supervisor", "client"]


async def handler(args, ctx):
    try:
        ctx.logger.info('Analyzing email' + str(args))

        # Use attribute access instead of dict-style access with .get()
        message_id = getattr(args, 'messageId', 'unknown')
        thread_id = getattr(args, 'threadId', 'unknown')
        subject = getattr(args, 'subject', '')
        # Using snippet instead of content as that's what's provided in EmailResponse
        content = getattr(args, 'snippet', '')
        sender = getattr(args, 'from', '')
        label_ids = getattr(args, 'labelIds', [])
        # Date might not be available, default to current time
        date_str = getattr(args, 'date', datetime.now().isoformat())

        # Combine subject and content for better analysis
        full_text = f"{subject}\n\n{content}"

        # Check sender domain for promotional patterns
        sender_domain = ""
        if '@' in sender:
            sender_domain = sender.split('@')[1].lower() if '@' in sender else ""
            sender_local = sender.split('@')[0].lower() if '@' in sender else ""
            
            # Check if sender appears to be a promotional source
            is_promo_sender = any(promo_term in sender_local for promo_term in PROMOTIONAL_DOMAINS)
            
            if is_promo_sender:
                ctx.logger.info(f"Detected promotional sender: {sender}")

        ctx.logger.info('Processing email: ' +
                        f"messageId={message_id}, " +
                        f"subject={subject[:50] + ('...' if len(subject) > 50 else '')}, " +
                        f"snippetLength={len(content)}, " +
                        f"from={sender}, " +
                        f"labels={label_ids}")

        # Analyze email category
        category_result = await analyze_category(full_text, ctx)
        ctx.logger.info('Category analysis complete' + str(category_result))

        # Analyze email urgency
        urgency_result = await analyze_urgency(full_text, subject, sender, date_str, ctx)
        ctx.logger.info('Urgency analysis complete' + str(urgency_result))

        # Analyze email importance
        importance_result = await analyze_importance(sender, subject, content, ctx)
        ctx.logger.info('Importance analysis complete' + str(importance_result))

        # Should email be archived? Default to false
        should_archive = False
        
        # Set archive flag for promotional emails with low urgency and importance
        if (category_result['category'].startswith('promotion.') or 
            (category_result.get('promotion_score', 0) > 0.7)):
            if urgency_result['urgency'] == 'low' and importance_result['importance'] == 'low':
                should_archive = True
                ctx.logger.info(f"Marking promotional email for archiving: {message_id}")

        # Emit the results
        await ctx.emit({
            'topic': 'gmail.email.analyzed',
            'data': {
                'messageId': message_id,
                'threadId': thread_id,
                'subject': subject,
                'from': sender,
                'category': category_result,
                'urgency': urgency_result,
                'importance': importance_result,
                'labelIds': label_ids,
                'shouldArchive': should_archive
            }
        })
        state = await ctx.state.get('email_analysis', 'processed_emails')
        
        if state is None:
            state = []

        state.append({
            'messageId': message_id,
            'threadId': thread_id,
            'category': category_result['category'],
            'urgency': urgency_result['urgency'],
            'importance': importance_result['importance'],
            'shouldArchive': should_archive,
            'processingTime': datetime.now().isoformat()
        })
        # Save analysis results to state
        await ctx.state.set('email_analysis', 'processed_emails', state)
    except Exception as e:
        ctx.logger.error(f"Error analyzing email: {str(e)}")

        # Emit error event for monitoring
        await ctx.emit({
            'topic': 'gmail.email.analysis.error',
            'data': {
                'messageId': getattr(args, 'messageId', 'unknown'),
                'threadId': getattr(args, 'threadId', 'unknown'),
                'error': str(e)
            }
        })

        # Return a default response with error indication
        return {
            'error': str(e),
            'category': {'category': 'unknown', 'confidence': 0},
            'urgency': {'urgency': 'medium', 'score': 0.5},
            'importance': {'importance': 'medium', 'score': 0.5}
        }


async def analyze_category(text, ctx):
    """
    Perform zero-shot classification to determine the email category
    
    Arguments:
        text: Combined email subject and content
        
    Returns:
        Dictionary with category and confidence score
    """
    try:
        # Use zero-shot classification to categorize the email
        result = classifier(
            text,
            EMAIL_CATEGORIES,
        )

        # Get the top category and its score
        top_category = result['labels'][0]
        confidence = result['scores'][0]

        # Get second-best category for potential refinement
        second_category = result['labels'][1] if len(result['labels']) > 1 else -1
        second_confidence = result['scores'][1] if len(result['scores']) > 1 else 0

        # Enhanced promotional email detection: Check for promotional signals in addition to classification
        # This helps catch promotional emails that might be misclassified
        promo_score = 0
        
        # Check for promotional keywords
        text_lower = text.lower()
        for keyword, weight in PROMOTION_KEYWORDS.items():
            if keyword in text_lower:
                promo_score += weight
        
        # Normalize the promo score
        promo_score = min(promo_score / 3.0, 1.0)  # Cap at 1.0
        
        # If strong promotional signals are detected, override classification
        if promo_score > 0.7 and not top_category.startswith("promotion."):
            ctx.logger.info(f"Overriding category from {top_category} to promotion based on keywords (score: {promo_score})")
            top_category = "promotion.marketing"
            confidence = max(confidence, promo_score)
        
        # If the top category has low confidence and second is close, use a hybrid approach
        if confidence < 0.6 and second_confidence > 0.3:
            # Extract main categories
            main_cat_1 = top_category.split('.')[0]
            main_cat_2 = second_category.split('.')[0] if second_category else -1

            if main_cat_1 == main_cat_2:
                # Same main category, strong consensus
                confidence = confidence + (second_confidence * 0.5)  # Boost confidence
            else:
                # Potentially ambiguous, keep original top category but note low confidence
                pass

        return {
            'category': top_category,
            'confidence': confidence,
            'alternative': second_category if second_confidence > 0.3 else -1,
            'promotion_score': promo_score if promo_score > 0.3 else -1
        }
    except Exception as e:
        ctx.logger.error(f"Error in category analysis: {str(e)}")
        return {
            'category': 'unknown',
            'confidence': 0.0
        }


async def analyze_urgency(text, subject, sender, date_str, ctx):
    """
    Determines the urgency of the email using multiple signals:
    - Sentiment analysis
    - Keyword detection
    - Time-related phrases
    - Sender information
    - Message timing
    
    Arguments:
        text: Combined email subject and content
        subject: Email subject line for special urgency keywords
        sender: Email sender for sender-based urgency signals
        date_str: Email date string for recency-based urgency
        
    Returns:
        Dictionary with urgency classification, score, and contributing factors
    """
    try:
        urgency_factors = {}

        # 1. Check for urgent keywords with weighted importance
        subject_lower = subject.lower()
        text_lower = text.lower()

        # Check keywords in subject (weighted higher)
        keyword_subject_score = 0
        for keyword, weight in URGENCY_KEYWORDS.items():
            if keyword in subject_lower:
                keyword_subject_score += weight
                urgency_factors[f"subject_keyword_{keyword}"] = weight

        # Check keywords in body (weighted lower)
        keyword_body_score = 0
        for keyword, weight in URGENCY_KEYWORDS.items():
            if keyword in text_lower and keyword not in subject_lower:  # Don't double-count
                keyword_body_score += weight * 0.5  # Half weight for body
                urgency_factors[f"body_keyword_{keyword}"] = weight * 0.5

        # Combine keyword scores (capped at 1.0)
        keyword_score = min(keyword_subject_score + (keyword_body_score * 0.5), 1.0)
        urgency_factors["keyword_score"] = keyword_score

        # 2. Check for low urgency phrases that might override
        low_urgency_signals = 0
        for phrase in LOW_URGENCY_PHRASES:
            if phrase in text_lower:
                low_urgency_signals += 1
                urgency_factors[f"low_urgency_phrase_{phrase}"] = -0.2

        low_urgency_modifier = min(low_urgency_signals * -0.2, -0.6)  # Cap negative effect
        urgency_factors["low_urgency_modifier"] = low_urgency_modifier if low_urgency_signals > 0 else 0

        # 3. Use sentiment analysis as part of urgency detection
        result = client.text_classification(
            text,
            model=URGENCY_MODEL
        )

        # Extract the sentiment score
        sentiment_score = 0.3  # Default moderate urgency
        for item in result:
            if item['label'] == 'NEGATIVE':
                sentiment_score = item['score']
                break

        urgency_factors["sentiment_score"] = sentiment_score

        # 4. Time-related urgency signals
        time_urgency = 0

        # Check for time-specific phrases
        time_phrases = ["today", "tomorrow", "this week", "by end of day", "by eod", "by morning"]
        for phrase in time_phrases:
            if phrase in text_lower:
                time_urgency += 0.15
                urgency_factors[f"time_phrase_{phrase}"] = 0.15

        # Check for dates and deadlines
        date_patterns = [
            r'\b(?:due|by|before)(?:\s+the)?\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))',
            r'\b(?:due|by|before)(?:\s+the)?\s+(\d{1,2}/\d{1,2}(?:/\d{2,4})?)',
            r'\b(?:due|by|before)(?:\s+the)?\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)'
        ]

        for pattern in date_patterns:
            if re.search(pattern, text_lower):
                time_urgency += 0.2
                urgency_factors["deadline_mentioned"] = 0.2
                break

        # 5. Recency factor - newer emails might be more urgent
        recency_score = 0
        try:
            # Parse the date
            email_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            now = datetime.now()

            # Calculate recency (within last 12 hours is more urgent)
            hours_old = (now - email_date).total_seconds() / 3600
            if hours_old < 12:
                recency_score = max(0, 0.2 - (hours_old / 60))  # Decay over time
                urgency_factors["recency"] = recency_score
        except Exception as e:
            print(f"Error parsing date: {e}")

        # 6. Combine all signals with appropriate weighting
        # Formula priorities: keywords > time signals > sentiment > recency
        urgency_score = (
                (keyword_score * 0.5) +
                (sentiment_score * 0.2) +
                (time_urgency * 0.2) +
                (recency_score * 0.1) +
                (low_urgency_modifier)  # This can reduce urgency
        )

        # Clamp the final score
        urgency_score = max(0, min(urgency_score, 1.0))

        # Classify urgency level
        if urgency_score > 0.7:
            urgency = "high"
        elif urgency_score > 0.4:
            urgency = "medium"
        else:
            urgency = "low"

        return {
            'urgency': urgency,
            'score': urgency_score,
            'factors': urgency_factors
        }
    except Exception as e:
        ctx.logger.error(f"Error in urgency analysis: {str(e)}")
        return {
            'urgency': 'medium',  # Default to medium on error
            'score': 0.5
        }


async def analyze_importance(sender, subject, content, ctx):
    """
    Determines the importance of the email based on sender, subject patterns,
    and content analysis
    
    Arguments:
        sender: Email sender address and name
        subject: Email subject line
        content: Email body content
        
    Returns:
        Dictionary with importance classification and score
    """
    try:
        importance_score = 0.5  # Default medium importance
        factors = {}

        # 1. Check sender importance
        sender_lower = sender.lower()

        # Check for VIP senders
        for vip in VIP_SENDERS:
            if vip in sender_lower:
                importance_score += 0.2
                factors["vip_sender"] = 0.2
                break

        # 2. Check for direct addressing
        # Emails addressed directly to the recipient tend to be more important
        if "dear" in content.lower()[:100] or "hi " in content.lower()[:50]:
            importance_score += 0.1
            factors["direct_addressing"] = 0.1

        # 3. Check email length
        # Very short or very long emails may have different importance characteristics
        content_length = len(content)
        if 100 <= content_length <= 1500:  # "Goldilocks" length - not too short, not too long
            importance_score += 0.1
            factors["optimal_length"] = 0.1
        elif content_length < 50:  # Very short emails might be less important
            importance_score -= 0.1
            factors["very_short"] = -0.1

        # 4. Subject line indicators
        subject_lower = subject.lower()
        if "re:" in subject_lower:  # Part of a thread
            importance_score += 0.1
            factors["is_reply"] = 0.1

        # 5. Question detection
        # Emails with questions often require action
        question_count = content.count('?')
        if question_count > 0:
            question_factor = min(question_count * 0.05, 0.2)  # Cap at 0.2
            importance_score += question_factor
            factors["questions"] = question_factor

        # Clamp the final score
        importance_score = max(0, min(importance_score, 1.0))

        # Classify importance level
        if importance_score > 0.7:
            importance = "high"
        elif importance_score > 0.4:
            importance = "medium"
        else:
            importance = "low"

        return {
            'importance': importance,
            'score': importance_score,
            'factors': factors
        }
    except Exception as e:
        ctx.logger.error(f"Error in importance analysis: {str(e)}")
        return {
            'importance': 'medium',  # Default to medium on error
            'score': 0.5
        }
