const { z } = require('zod');
const axios = require('axios')

exports.config = {
  type: 'event',
  name: 'FinalLinkedInPost',
  description: 'Posts to LinkedIn',
  subscribes: ['final-linkedin-post-ready'],
  emits: [],
  input: z.object({
    finalPost: z.string(),
    generated_for: z.string(),
  }),
  flows: ['LinkedIn-content-agent'],
};

exports.handler = async (input, { state, logger }) => {
  logger.info(`📣 Final post for ${input.generated_for}:`);

  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    logger.error('❌ LINKEDIN_ACCESS_TOKEN is not set in env')
    return
  }

  try {
    // Get the image URL from state
    const urlObj = await state.get(input.generated_for, 'imgURL')
    const imageUrl = urlObj.imageUrl

    let postBody = {
      author: process.env.LINKEDIN_URN,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: input.finalPost,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    // If we have an image URL, upload it and modify the post body
    if (imageUrl) {
      try {
        // Register the image upload
        const registerPayload = {
          registerUploadRequest: {
            owner: process.env.LINKEDIN_URN,
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            serviceRelationships: [
              {
                identifier: 'urn:li:userGeneratedContent',
                relationshipType: 'OWNER'
              }
            ]
          }
        }

        const registerResponse = await axios.post(
          `https://api.linkedin.com/v2/assets?action=registerUpload&oauth2_access_token=${process.env.LINKEDIN_ACCESS_TOKEN}`,
          registerPayload,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )

        const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl
        const assetUrn = registerResponse.data.value.asset

        // Download the image and upload it to LinkedIn
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer'
        })

        await axios.post(uploadUrl, imageResponse.data, {
          headers: {
            'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/octet-stream',
          }
        })

        // Update post body to include the image
        postBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE'
        postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            media: assetUrn
          }
        ]

        logger.info('✅ Image uploaded and registered for LinkedIn post')
      } catch (imageError) {
        logger.error('❌ Failed to upload image, posting text only:', imageError.message)
        // Continue with text-only post if image upload fails
      }
    }

    // Post to LinkedIn (with or without image)
    const res = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      postBody,
      {
        headers: {
          Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    logger.info('✅ Posted to LinkedIn')
    await state.clear(input.generated_for);
    logger.info('State cleared')


  } catch (err) {
    console.log(err)
    logger.error('❌ Failed to post to LinkedIn:', err.message)
  }

};