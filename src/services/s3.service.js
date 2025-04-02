const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const ApiError = require("../utils/ApiError");

class S3Service {
    constructor() {
        // Initialize the S3 client with AWS SDK v3
        this.client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
        this.bucket = process.env.AWS_S3_BUCKET;
    }

    async generatePresignedUrl(fileType, entityType, entityId, imageType) {
        // Validate file type
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(fileType)) {
            throw new ApiError(
                "Invalid file type. Only JPEG, PNG and WebP are allowed",
                400
            );
        }

        // Get file extension
        const extension = fileType.split("/")[1];

        // Generate a unique filename using user ID to ensure overwriting old images
        // Format: entity-type/entity-id/image-type-timestamp.extension
        const key = `${entityType}/${entityId}/${imageType}-${Date.now()}.${extension}`;

        try {
            // Create a PutObject command
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                ContentType: fileType,
            });

            // Generate pre-signed URL with 5 minute expiration
            const uploadUrl = await getSignedUrl(this.client, command, {
                expiresIn: 300,
            });

            return {
                uploadUrl,
                key,
            };
        } catch (error) {
            console.error("Error generating pre-signed URL:", error);
            throw new ApiError("Failed to generate upload URL", 500);
        }
    }

    async deleteObject(key) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            await this.client.send(command);
            return true;
        } catch (error) {
            console.error("Error deleting object from S3:", error);
            // Don't throw here - we don't want to fail if deletion doesn't work
            return false;
        }
    }
}

module.exports = new S3Service();
