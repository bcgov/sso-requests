export interface ITestimonial {
  title: string;
  id: number;
  author: {
    name: string;
    title: string;
  };
  body: string;
  rating: number;
}
