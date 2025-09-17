// middlewares/postValidation.js
export const postValidation = (req, res, next) => {
  const content = req.body?.content || "";
  const hasContent = content.trim().length > 0;
  const hasImages = req.files && req.files.length > 0;

  if (!hasContent && !hasImages) {
    return res.status(400).json({
      errors: [
        {
          type: "field",
          msg: "Post must have either text, image, or both",
          path: "content",
          location: "body",
        },
      ],
    });
  }

  // Auto-detect post_type
  if (hasContent && hasImages) {
    req.body.post_type = "text_with_image";
  } else if (hasContent) {
    req.body.post_type = "text";
  } else if (hasImages) {
    req.body.post_type = "image";
  }

  next();
};
