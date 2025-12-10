export const config = {
  type: 'api',
  name: 'UploadPaper',
  path: '/api/upload-paper',
  method: 'POST',
  emits: ['paper-uploaded'],
  flows: ['research-assistant']
}

export const handler = async (request: any, { emit }: { emit: any }) => {
  try {
    const { title, authors, abstract, pdfUrl, doi } = request.body;
    
    if (!title || !pdfUrl) {
      return {
        status: 400,
        body: { error: 'Title and PDF URL are required' }
      };
    }
    
    const paperId = `paper-${Date.now()}`;
    
    await emit({
      topic: 'paper-uploaded',
      data: {
        id: paperId,
        title,
        authors: authors || [],
        abstract: abstract || '',
        pdfUrl,
        doi: doi || '',
        uploadedAt: new Date().toISOString()
      }
    });
    
    return {
      status: 200,
      body: { 
        success: true, 
        message: 'Paper uploaded successfully',
        paperId
      }
    };
  } catch (error) {
    console.error('Error uploading paper:', error);
    return {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
}
