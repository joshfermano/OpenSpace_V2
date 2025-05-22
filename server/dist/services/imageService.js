"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBase64Image = exports.deleteImage = exports.uploadImage = exports.initializeStorage = void 0;
const supabase_1 = require("../config/supabase");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const os_1 = __importDefault(require("os"));
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'openspace-images';
const initializeStorage = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data: buckets, error: listError } = yield supabase_1.supabase.storage.listBuckets();
        if (listError) {
            console.error('Error listing buckets:', listError.message);
            console.log('Will use existing bucket or create it manually in Supabase dashboard');
            return;
        }
        if (!(buckets === null || buckets === void 0 ? void 0 : buckets.find((bucket) => bucket.name === BUCKET_NAME))) {
            console.log(`Bucket "${BUCKET_NAME}" not found, attempting to create it...`);
            try {
                const { error } = yield supabase_1.supabase.storage.createBucket(BUCKET_NAME, {
                    public: true,
                    fileSizeLimit: 10485760,
                });
                if (error) {
                    console.error('Failed to create bucket:', error.message);
                    console.warn(`Please create the "${BUCKET_NAME}" bucket manually in the Supabase dashboard`);
                }
                else {
                    console.log(`Created Supabase bucket: ${BUCKET_NAME}`);
                }
            }
            catch (createError) {
                console.error('Error creating bucket:', createError);
                console.warn(`Please create the "${BUCKET_NAME}" bucket manually in the Supabase dashboard`);
            }
        }
        else {
            console.log(`Using existing Supabase bucket: ${BUCKET_NAME}`);
            // Ensure the bucket is public
            try {
                const { error } = yield supabase_1.supabase.storage.updateBucket(BUCKET_NAME, {
                    public: true,
                    fileSizeLimit: 10485760,
                });
                if (error) {
                    console.error('Failed to update bucket settings:', error.message);
                }
                else {
                    console.log('Bucket settings updated successfully');
                }
            }
            catch (error) {
                console.error('Error updating bucket settings:', error);
            }
        }
    }
    catch (error) {
        console.error('Failed to initialize Supabase storage:', error);
        console.warn('Image storage functionality may be limited');
    }
});
exports.initializeStorage = initializeStorage;
// Function to upload a local file to Supabase
const uploadImage = (filePath, folder, customFilename) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`);
        }
        const fileContent = fs_1.default.readFileSync(filePath);
        const fileExt = path_1.default.extname(filePath);
        const filename = customFilename || `${folder}-${(0, uuid_1.v4)()}${fileExt}`;
        const supabasePath = `${folder}/${filename}`;
        // Check if bucket exists
        const { data: buckets, error: listError } = yield supabase_1.supabase.storage.listBuckets();
        if (listError) {
            console.error('Error checking buckets:', listError.message);
            return null;
        }
        const bucketExists = buckets.some((bucket) => bucket.name === BUCKET_NAME);
        if (!bucketExists) {
            console.error(`Bucket ${BUCKET_NAME} does not exist`);
            return null;
        }
        console.log(`Uploading to Supabase path: ${supabasePath}`);
        const { error } = yield supabase_1.supabase.storage
            .from(BUCKET_NAME)
            .upload(supabasePath, fileContent, {
            contentType: getContentType(fileExt),
            upsert: true, // Changed to true to overwrite if file exists
        });
        if (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
        // Get public URL
        const { data: publicUrlData } = supabase_1.supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(supabasePath);
        if (!publicUrlData || !publicUrlData.publicUrl) {
            console.error('Failed to get public URL');
            return null;
        }
        console.log('File uploaded successfully:', publicUrlData.publicUrl);
        // Delete the temporary local file
        fs_1.default.unlinkSync(filePath);
        return publicUrlData.publicUrl;
    }
    catch (error) {
        console.error(`Error uploading image to Supabase:`, error);
        return null;
    }
});
exports.uploadImage = uploadImage;
// Function to delete an image from Supabase
const deleteImage = (imageUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract path from URL
        const urlObj = new URL(imageUrl);
        const pathParts = urlObj.pathname.split('/');
        const storagePath = pathParts.slice(3).join('/'); // Remove /storage/v1/object/public/
        const { error } = yield supabase_1.supabase.storage
            .from(BUCKET_NAME)
            .remove([storagePath]);
        if (error)
            throw error;
        return true;
    }
    catch (error) {
        console.error('Error deleting image from Supabase:', error);
        return false;
    }
});
exports.deleteImage = deleteImage;
// Helper function to determine content type from file extension
const getContentType = (extension) => {
    const types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
    };
    return types[extension.toLowerCase()] || 'application/octet-stream';
};
// Function to upload a base64 encoded image string to Supabase
const uploadBase64Image = (base64String, folder, customFilename) => __awaiter(void 0, void 0, void 0, function* () {
    let tempFilePath = '';
    try {
        // Extract mime type and base64 data
        const matches = base64String.match(/^data:(.+?);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 string format');
        }
        const mimeType = matches[1];
        const base64Data = matches[2];
        // Determine file extension
        const extension = mimeType.split('/')[1];
        if (!extension) {
            throw new Error('Could not determine file extension from mime type');
        }
        const fileExt = `.${extension}`;
        // Create a buffer from the base64 data
        const imageBuffer = Buffer.from(base64Data, 'base64');
        // Generate a unique temporary file name
        const tempDir = os_1.default.tmpdir(); // Use OS temporary directory
        const tempFilename = customFilename
            ? `${customFilename}${fileExt}`
            : `${folder}-${(0, uuid_1.v4)()}${fileExt}`;
        tempFilePath = path_1.default.join(tempDir, tempFilename);
        // Write the buffer to the temporary file
        fs_1.default.writeFileSync(tempFilePath, imageBuffer);
        // Upload the temporary file using the existing uploadImage function
        const publicUrl = yield (0, exports.uploadImage)(tempFilePath, folder, tempFilename); // Pass tempFilename as customFilename to uploadImage
        // The uploadImage function already handles deleting the tempFilePath upon success
        // If uploadImage fails, we'll delete it in the finally block
        return publicUrl;
    }
    catch (error) {
        console.error('Error in uploadBase64Image:', error);
        return null;
    }
    finally {
        // Ensure temporary file is deleted if it still exists (e.g., if uploadImage failed before deleting)
        if (tempFilePath && fs_1.default.existsSync(tempFilePath)) {
            try {
                fs_1.default.unlinkSync(tempFilePath);
                console.log(`Cleaned up temporary file: ${tempFilePath}`);
            }
            catch (cleanupError) {
                console.error('Error cleaning up temporary file:', cleanupError);
            }
        }
    }
});
exports.uploadBase64Image = uploadBase64Image;
