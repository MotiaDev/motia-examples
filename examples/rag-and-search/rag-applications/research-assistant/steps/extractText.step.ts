export const config = {
  type: 'event',
  name: 'ExtractText',
  subscribes: ['paper-uploaded'],
  emits: ['text-extracted'],
  flows: ['research-assistant']
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, pdfUrl, doi, uploadedAt } = input;
    
    console.log(`Extracting text from paper: ${title}`);
    
    
    const extractedText = abstract + "\n\n" + 
      "This is simulated full text extraction from the PDF. " +
      "In a real implementation, this would contain the actual content of the paper. " +
      "The text would include all sections like introduction, methodology, results, " +
      "discussion, and conclusion.";
    
    await emit({
      topic: 'text-extracted',
      data: {
        id,
        title,
        authors,
        abstract,
        pdfUrl,
        doi,
        uploadedAt,
        fullText: extractedText,
        extractedAt: new Date().toISOString()
      }
    });
    
    console.log(`Text extracted from paper: ${title}`);
    
  } catch (error) {
    console.error('Error extracting text:', error);
  }
}
