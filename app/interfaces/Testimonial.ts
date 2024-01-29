export interface ITestimonial {
  id: number;
  author: {
    name: string;
    title: string;
  };
  body: string;
  rating: number;
}
