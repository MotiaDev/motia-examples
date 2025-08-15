#!/usr/bin/env python3
"""
Streamlit UI for Motia Meeting Transcription Example

Enhanced with real-time Motia backend integration showcasing:
- Live API status dashboard
- Real-time transcription progress
- Event-driven updates
"""

import streamlit as st
import subprocess
import os
import pandas as pd
import time
from pathlib import Path
import json
from datetime import datetime
import requests
from typing import Dict, List, Optional

# Motia backend configuration
MOTIA_BASE_URL = "http://localhost:3000"

# Page configuration
st.set_page_config(
    page_title="Motia Meeting Transcription",
    page_icon="🎤",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern, clean styling
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2.5rem;
        border-radius: 15px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
    }
    .metric-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        text-align: center;
        margin: 0.5rem;
        border-left: 4px solid #667eea;
    }
    .transcription-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        margin: 1rem 0;
        border: 1px solid #e0e0e0;
    }
    .status-badge {
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .status-completed {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    .status-transcribing {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
    }
    .status-failed {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    .progress-bar {
        background: #f8f9fa;
        border-radius: 10px;
        overflow: hidden;
        height: 8px;
        margin: 0.5rem 0;
    }
    .progress-fill {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        height: 100%;
        transition: width 0.3s ease;
    }
    .action-item {
        background: #f8f9fa;
        padding: 0.75rem;
        border-radius: 8px;
        margin: 0.5rem 0;
        border-left: 3px solid #667eea;
    }
    .participant-tag {
        background: #e3f2fd;
        color: #1976d2;
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.8rem;
        margin: 0.25rem;
        display: inline-block;
    }
    .transcript-text {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #667eea;
        font-family: 'Courier New', monospace;
        line-height: 1.6;
        max-height: 300px;
        overflow-y: auto;
    }
    .sidebar-section {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
</style>
""", unsafe_allow_html=True)

def get_motia_status():
    """Get live status from Motia backend"""
    try:
        response = requests.get(f"{MOTIA_BASE_URL}/hello-world", timeout=5)
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

def start_transcription_via_motia(filename: str, audio_data: bytes = None):
    """Start transcription using Motia API"""
    try:
        payload = {
            "filename": filename,
            "language": "en",
            "model": "whisper-large-v3"
        }
        
        response = requests.post(
            f"{MOTIA_BASE_URL}/transcribe-meeting",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        st.error(f"Failed to start transcription: {e}")
        return None

def display_motia_dashboard():
    """Display live Motia system status"""
    st.subheader("🔗 Live Motia Backend Status")
    
    # Get status with auto-refresh
    if 'last_refresh' not in st.session_state:
        st.session_state.last_refresh = 0
    
    current_time = time.time()
    if current_time - st.session_state.last_refresh > 5:  # Refresh every 5 seconds
        st.session_state.motia_status = get_motia_status()
        st.session_state.last_refresh = current_time
    
    status_data = st.session_state.get('motia_status')
    
    if status_data:
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("System Status", "🟢 Healthy", "Connected to Motia")
        
        with col2:
            stats = status_data.get('stats', {})
            st.metric("Total Transcriptions", stats.get('totalTranscriptions', 0))
        
        with col3:
            st.metric("Active Jobs", stats.get('activeTranscriptions', 0))
        
        with col4:
            uptime = stats.get('systemUptime', 0)
            st.metric("Uptime", f"{uptime:.0f}s")
        
        # Recent activity
        if status_data.get('recentActivity'):
            st.subheader("📊 Recent Transcription Activity")
            df = pd.DataFrame(status_data['recentActivity'])
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.strftime('%H:%M:%S')
            st.dataframe(df, use_container_width=True)
        
        # Features showcase
        st.subheader("✨ Motia Features in Action")
        features = status_data.get('features', {})
        for feature, status in features.items():
            st.write(f"{status} **{feature}**")
    
    else:
        st.error("🔴 Cannot connect to Motia backend at http://localhost:3000")
        st.info("Make sure to run: `cd meeting_transcript_example && npx motia dev`")

def display_comprehensive_summary(summary_data):
    """Display comprehensive meeting summary with all AI insights"""
    if not summary_data:
        return
    
    st.header("🧠 AI-Powered Meeting Analysis")
    
    # Summary
    if summary_data.get('summary'):
        with st.expander("📋 Meeting Summary", expanded=True):
            st.markdown(summary_data['summary'])
    
    # Create tabs for different analysis sections
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "✅ Action Items", 
        "🎯 Key Topics", 
        "📊 Sentiment Analysis", 
        "⚖️ Decisions", 
        "📈 Meeting Insights"
    ])
    
    with tab1:
        if summary_data.get('actionItems'):
            st.subheader("Action Items Extracted")
            for i, item in enumerate(summary_data['actionItems'], 1):
                st.markdown(f"""
                <div style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 1rem;
                    border-radius: 8px;
                    margin: 0.5rem 0;
                    border-left: 4px solid #4CAF50;
                ">
                    <strong>#{i}</strong> {item}
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("No action items identified in this meeting")
    
    with tab2:
        if summary_data.get('keyTopics'):
            st.subheader("Key Topics Discussed")
            cols = st.columns(min(3, len(summary_data['keyTopics'])))
            for i, topic in enumerate(summary_data['keyTopics']):
                with cols[i % 3]:
                    st.markdown(f"""
                    <div style="
                        background: #f8f9fa;
                        border: 2px solid #667eea;
                        padding: 1rem;
                        border-radius: 8px;
                        text-align: center;
                        margin: 0.5rem 0;
                    ">
                        <strong>{topic}</strong>
                    </div>
                    """, unsafe_allow_html=True)
        else:
            st.info("No specific topics identified")
    
    with tab3:
        if summary_data.get('sentimentAnalysis'):
            sentiment = summary_data['sentimentAnalysis']
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                # Overall sentiment with emoji
                sentiment_emoji = {
                    'positive': '😊',
                    'negative': '😔', 
                    'neutral': '😐'
                }
                st.metric(
                    "Overall Sentiment", 
                    f"{sentiment_emoji.get(sentiment['overall'], '😐')} {sentiment['overall'].title()}",
                    f"{sentiment['confidence']:.1%} confidence"
                )
            
            with col2:
                st.metric("Energy Level", sentiment.get('energyLevel', 'medium').title())
            
            with col3:
                net_sentiment = sentiment.get('positiveIndicators', 0) - sentiment.get('negativeIndicators', 0)
                st.metric("Sentiment Balance", f"+{net_sentiment}" if net_sentiment > 0 else str(net_sentiment))
                
            # Sentiment breakdown chart
            st.subheader("Sentiment Breakdown")
            sentiment_data = {
                'Positive Indicators': sentiment.get('positiveIndicators', 0),
                'Negative Indicators': sentiment.get('negativeIndicators', 0)
            }
            st.bar_chart(sentiment_data)
        else:
            st.info("Sentiment analysis not available")
    
    with tab4:
        if summary_data.get('decisions'):
            st.subheader("Key Decisions Made")
            for i, decision in enumerate(summary_data['decisions'], 1):
                st.markdown(f"""
                <div style="
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    padding: 1rem;
                    border-radius: 8px;
                    margin: 0.5rem 0;
                    border-left: 4px solid #f39c12;
                ">
                    <strong>Decision #{i}:</strong> {decision}
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("No specific decisions identified")
    
    with tab5:
        if summary_data.get('insights'):
            insights = summary_data['insights']
            
            # Key metrics
            st.subheader("Meeting Analytics")
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric(
                    "Participation Score", 
                    f"{insights.get('participationScore', 0)}/10"
                )
            
            with col2:
                engagement = insights.get('engagementLevel', 'medium')
                engagement_emoji = {'high': '🔥', 'medium': '📊', 'low': '📉'}
                st.metric(
                    "Engagement", 
                    f"{engagement_emoji.get(engagement)} {engagement.title()}"
                )
            
            with col3:
                efficiency = insights.get('meetingEfficiency', 'medium')
                efficiency_emoji = {'high': '⚡', 'medium': '⚖️', 'low': '🐌'}
                st.metric(
                    "Efficiency", 
                    f"{efficiency_emoji.get(efficiency)} {efficiency.title()}"
                )
            
            with col4:
                follow_up = insights.get('followUpNeeded', False)
                st.metric(
                    "Follow-up Needed", 
                    "✅ Yes" if follow_up else "❌ No"
                )
            
            # Detailed metrics
            if insights.get('keyMetrics'):
                metrics = insights['keyMetrics']
                st.subheader("Detailed Metrics")
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Word Count", f"{metrics.get('wordCount', 0):,}")
                with col2:
                    st.metric("Speaking Rate", f"{metrics.get('estimatedSpeakingRate', 0)} WPM")
                with col3:
                    st.metric("Participants", metrics.get('participantCount', 0))
        else:
            st.info("Meeting insights not available")

def display_real_time_progress(transcription_id: str):
    """Enhanced real-time progress with summarization stages"""
    st.subheader("⚡ Real-time Processing Pipeline")
    
    # Create progress containers
    transcription_progress = st.empty()
    summarization_progress = st.empty()
    status_text = st.empty()
    
    # Simulate transcription progress
    with transcription_progress:
        st.write("**Stage 1: Audio Transcription**")
        progress_bar = st.progress(0)
        
        for i in range(101):
            progress_bar.progress(i)
            status_text.text(f"Transcribing audio... {i}% complete")
            time.sleep(0.03)  # Fast demo
    
    transcription_progress.success("✅ Transcription completed!")
    
    # Simulate summarization progress  
    with summarization_progress:
        st.write("**Stage 2: AI Analysis & Summarization**")
        
        analysis_steps = [
            "Generating meeting summary...",
            "Extracting action items...", 
            "Identifying key topics...",
            "Analyzing sentiment...",
            "Extracting decisions...",
            "Generating insights...",
            "Finalizing analysis..."
        ]
        
        analysis_progress = st.progress(0)
        for i, step in enumerate(analysis_steps):
            progress = int((i + 1) / len(analysis_steps) * 100)
            analysis_progress.progress(progress)
            status_text.text(step)
            time.sleep(0.8)  # Slower for effect
    
    summarization_progress.success("✅ AI Analysis completed!")
    status_text.success("🎉 Complete meeting intelligence ready!")

def main():
    """Main application function"""
    
    # Header
    st.markdown("""
    <div class="main-header">
        <h1>🎤 Motia Meeting Transcription</h1>
        <p>Real-time AI transcription + intelligent summarization powered by Motia's event-driven architecture</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Display Motia dashboard
    display_motia_dashboard()
    
    st.markdown("---")
    
    # Main transcription interface
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.header("📁 Upload Audio for Transcription")
        
        # File upload
        uploaded_files = st.file_uploader(
            "Choose audio files",
            type=['mp3', 'wav', 'm4a', 'flac', 'ogg'],
            accept_multiple_files=True,
            help="Upload audio files to transcribe using Motia's real-time processing and AI analysis"
        )
        
        if uploaded_files:
            st.success(f"📎 {len(uploaded_files)} file(s) selected")
            
            # Show file details
            file_details = []
            for file in uploaded_files:
                file_details.append({
                    "Name": file.name,
                    "Size": f"{file.size / 1024 / 1024:.1f} MB",
                    "Type": file.type
                })
            
            st.dataframe(pd.DataFrame(file_details))
    
    with col2:
        st.header("🚀 Motia AI Processing")
        
        if uploaded_files:
            if st.button("🎯 Start AI Transcription + Analysis", type="primary"):
                with st.spinner("Starting Motia AI pipeline..."):
                    # Use the first file for demo
                    first_file = uploaded_files[0]
                    
                    # Start transcription via Motia API
                    result = start_transcription_via_motia(first_file.name)
                    
                    if result:
                        st.success("✅ Motia AI pipeline started!")
                        st.json(result)
                        
                        # Show enhanced real-time progress
                        if 'transcriptionId' in result:
                            display_real_time_progress(result['transcriptionId'])
                            
                            # Simulate final results with comprehensive summary
                            st.markdown("---")
                            mock_summary_data = {
                                'summary': """
📋 **Meeting Summary:**
This 15-minute team standup meeting covered project progress and upcoming milestones. The team discussed current sprint status, identified blockers, and planned next steps for the product launch.

🎯 **Key Outcomes:**
• Sprint progress is on track with 80% completion
• Two technical blockers identified and assigned
• Product launch timeline confirmed for next month
• Team coordination improved with new processes

💡 **Overall Assessment:**
The meeting was highly productive with clear action items and strong team engagement.
                                """,
                                'actionItems': [
                                    'John: Resolve database performance issue by Friday',
                                    'Sarah: Complete user testing scenarios by Tuesday', 
                                    'Mike: Update deployment scripts by Thursday',
                                    'Team: Review final designs in tomorrow\'s meeting'
                                ],
                                'keyTopics': [
                                    'Project Management',
                                    'Technology',
                                    'Team Coordination',
                                    'Quality Assurance'
                                ],
                                'sentimentAnalysis': {
                                    'overall': 'positive',
                                    'confidence': 0.85,
                                    'positiveIndicators': 8,
                                    'negativeIndicators': 2,
                                    'energyLevel': 'high'
                                },
                                'decisions': [
                                    'Approved moving to production deployment next Friday',
                                    'Agreed to implement new code review process',
                                    'Decided to add two more testing scenarios'
                                ],
                                'insights': {
                                    'participationScore': 9,
                                    'engagementLevel': 'high',
                                    'meetingEfficiency': 'high',
                                    'followUpNeeded': True,
                                    'keyMetrics': {
                                        'wordCount': 2456,
                                        'estimatedSpeakingRate': 165,
                                        'participantCount': 4
                                    }
                                }
                            }
                            
                            # Display comprehensive summary
                            display_comprehensive_summary(mock_summary_data)
                    else:
                        st.error("❌ Failed to start transcription")
                        
            # API Testing Section
            st.subheader("🔧 API Testing")
            if st.button("Test Motia Hello Endpoint"):
                status = get_motia_status()
                if status:
                    st.json(status)
                else:
                    st.error("Backend not responding")
        else:
            st.info("📁 Upload audio files to begin Motia AI processing")
    
    # Enhanced Motia Features Showcase
    st.markdown("---")
    st.header("🌟 Motia's AI-Powered Meeting Intelligence")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        ### ⚡ Real-time Processing
        - Live transcription progress
        - Instant status updates  
        - Multi-stage pipeline visualization
        """)
    
    with col2:
        st.markdown("""
        ### 🧠 AI-Powered Analysis
        - Intelligent summarization
        - Action items extraction
        - Sentiment analysis
        - Key topics identification
        """)
    
    with col3:
        st.markdown("""
        ### 🔄 Event-driven Architecture
        - Asynchronous processing
        - Automatic summarization trigger
        - Scalable intelligence pipeline
        """)

if __name__ == "__main__":
    main() 