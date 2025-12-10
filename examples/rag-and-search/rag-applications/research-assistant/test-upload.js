// Simple test script for the upload-paper endpoint
// Using Node.js built-in fetch API (available in Node.js v20+)

async function testUploadPaper() {
  try {
    const response = await fetch('http://localhost:3000/api/upload-paper', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Mem0',
        authors: 'Prateek Chhikara, Dev Khant, Saket Aryan, Taranjeet Singh, Deshraj Yadav',
        abstract: 'Large Language Models (LLMs) have demonstrated remarkable prowess in generating contextually coherent responses, yet their fixed context windows pose fundamental challenges for maintaining consistency over prolonged multi-session dialogues. We introduce Mem0, a scalable memory-centric architecture that addresses this issue by dynamically extracting, consolidating, and retrieving salient information from ongoing conversations.',
        pdfUrl: 'https://arxiv.org/pdf/2504.19413',
        doi: '2504.19413'
      }),
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testUploadPaper();
