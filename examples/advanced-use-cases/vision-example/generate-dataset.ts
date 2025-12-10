async function generateImages(numImages: number = 10) {
    const prompt = "create an image of a couple backpacking through a trail in the easter sierras. use a black and white image style. sketch style.";
    
    const requests = Array(numImages).fill(null).map(() => 
        fetch('http://localhost:3000/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        }).then(res => res.json())
    );

    try {
        const results = await Promise.all(requests);
        console.log(`Successfully generated ${results.length} images`);
        return results;
    } catch (error) {
        console.error('Error generating images:', error);
        throw error;
    }
}

generateImages()
    .then(results => console.log('All images generated:', results))
    .catch(error => console.error('Failed to generate images:', error));
