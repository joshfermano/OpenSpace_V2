import { supabase } from '../config/supabase';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'openspace-images';

export const initializeStorage = async (): Promise<void> => {
  try {
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError.message);
      console.log(
        'Will use existing bucket or create it manually in Supabase dashboard'
      );
      return;
    }

    if (!buckets?.find((bucket) => bucket.name === BUCKET_NAME)) {
      console.log(
        `Bucket "${BUCKET_NAME}" not found, attempting to create it...`
      );
      try {
        const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 10485760,
        });

        if (error) {
          console.error('Failed to create bucket:', error.message);
          console.warn(
            `Please create the "${BUCKET_NAME}" bucket manually in the Supabase dashboard`
          );
        } else {
          console.log(`Created Supabase bucket: ${BUCKET_NAME}`);
        }
      } catch (createError) {
        console.error('Error creating bucket:', createError);
        console.warn(
          `Please create the "${BUCKET_NAME}" bucket manually in the Supabase dashboard`
        );
      }
    } else {
      console.log(`Using existing Supabase bucket: ${BUCKET_NAME}`);

      // Ensure the bucket is public
      try {
        const { error } = await supabase.storage.updateBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 10485760,
        });

        if (error) {
          console.error('Failed to update bucket settings:', error.message);
        } else {
          console.log('Bucket settings updated successfully');
        }
      } catch (error) {
        console.error('Error updating bucket settings:', error);
      }
    }
  } catch (error) {
    console.error('Failed to initialize Supabase storage:', error);
    console.warn('Image storage functionality may be limited');
  }
};

// Function to upload a local file to Supabase
export const uploadImage = async (
  filePath: string,
  folder: 'rooms' | 'profiles' | 'reviews' | 'verifications',
  customFilename?: string
): Promise<string | null> => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath);
    const fileExt = path.extname(filePath);
    const filename = customFilename || `${folder}-${uuidv4()}${fileExt}`;
    const supabasePath = `${folder}/${filename}`;

    // Check if bucket exists
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

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
    const { error } = await supabase.storage
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
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(supabasePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Failed to get public URL');
      return null;
    }

    console.log('File uploaded successfully:', publicUrlData.publicUrl);

    // Delete the temporary local file
    fs.unlinkSync(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading image to Supabase:`, error);
    return null;
  }
};

// Function to delete an image from Supabase
export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract path from URL
    const urlObj = new URL(imageUrl);
    const pathParts = urlObj.pathname.split('/');
    const storagePath = pathParts.slice(3).join('/'); // Remove /storage/v1/object/public/

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting image from Supabase:', error);
    return false;
  }
};

// Helper function to determine content type from file extension
const getContentType = (extension: string): string => {
  const types: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  return types[extension.toLowerCase()] || 'application/octet-stream';
};

// Function to upload a base64 encoded image string to Supabase
export const uploadBase64Image = async (
  base64String: string,
  folder: 'rooms' | 'profiles' | 'reviews' | 'verifications',
  customFilename?: string
): Promise<string | null> => {
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
    const tempDir = os.tmpdir(); // Use OS temporary directory
    const tempFilename = customFilename
      ? `${customFilename}${fileExt}`
      : `${folder}-${uuidv4()}${fileExt}`;
    tempFilePath = path.join(tempDir, tempFilename);

    // Write the buffer to the temporary file
    fs.writeFileSync(tempFilePath, imageBuffer);

    // Upload the temporary file using the existing uploadImage function
    const publicUrl = await uploadImage(tempFilePath, folder, tempFilename); // Pass tempFilename as customFilename to uploadImage

    // The uploadImage function already handles deleting the tempFilePath upon success
    // If uploadImage fails, we'll delete it in the finally block

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadBase64Image:', error);
    return null;
  } finally {
    // Ensure temporary file is deleted if it still exists (e.g., if uploadImage failed before deleting)
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary file:', cleanupError);
      }
    }
  }
};
