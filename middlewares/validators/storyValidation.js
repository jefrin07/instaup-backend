export const storyValidation = (req, res, next) => {
  const content = req.body?.content || "";
  const hasContent = content.trim().length > 0;
  const hasImages = Array.isArray(req.files) && req.files.length > 0;

  if (!hasContent && !hasImages) {
    return res.status(400).json({
      errors: [
        {
          type: "field",
          msg: "Story must have either text, image, or both",
          path: "content",
          location: "body",
        },
      ],
    });
  }

  if (hasContent && hasImages) {
    req.body.story_type = "text_with_image";
  } else if (hasContent) {
    req.body.story_type = "text";
  } else if (hasImages) {
    req.body.story_type = "image";
  }

  next();
};
