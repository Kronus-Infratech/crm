import api from './api';

/**
 * Upload a file to Cloudflare R2 via the backend API
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} - The uploaded file data (consistent with old Supabase structure)
 */
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Track upload progress if needed in the future
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
      },
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Upload failed');
    }
  } catch (error) {
    console.error("R2 Frontend Upload Error:", error);
    throw error;
  }
};
