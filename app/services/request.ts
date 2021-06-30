import { instance } from './axios';

// TODO: Add interface for formdata once form fields are more solid
export const submitRequest = async (formData: any) => {
  try {
    await instance.post('/api/info', formData).then((res) => res.data);
  } catch (err) {
    console.error(err);
    return null;
  }
};
