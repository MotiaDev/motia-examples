import requests

def download_image(image_url, save_path="image.png"):
    """Encodes an image from a URL to base64."""

    response = requests.get(image_url)
    if response.status_code == 200:
        # Save the image locally
        with open(save_path, "wb") as f:
            f.write(response.content)

        return save_path
    else:
        return None