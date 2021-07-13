interface User {
  email: string;
}

export interface IndexPageProps {
  currentUser: User;
  setCurrentUser: Function;
  setFormData: Function;
}

export interface RequestPageProps {
  currentUser: User;
  formData: any;
  setFormData: Function;
}

export interface ContainerProps {
  children: any;
}

export interface FormStageBox {
  title: string;
  stageNumber: number;
  active?: boolean;
}
