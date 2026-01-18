const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

/**
 * Upload a file to Cloudflare R2
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - The name to store the file as
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
const uploadToR2 = async (fileBuffer, fileName, contentType) => {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrlBase = process.env.R2_PUBLIC_URL;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!bucketName || !accountId || !accessKeyId || !secretAccessKey || !publicUrlBase) {
    console.error("Missing R2 configuration");
    throw new Error("Cloudflare R2 storage is not properly configured. Check your .env file.");
  }

  const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  try {
    await r2Client.send(command);

    // Construct the public URL
    const base = publicUrlBase.endsWith('/') ? publicUrlBase : `${publicUrlBase}/`;
    const finalUrl = `${base}${fileName}`;
    console.log(`[R2] Successfully uploaded ${fileName} to ${bucketName}. Public URL: ${finalUrl}`);
    return finalUrl;
  } catch (error) {
    console.error("R2 Upload Execution Error:", error);
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
};

module.exports = {
  uploadToR2,
};
