import * as React from 'react';

type FormFieldContextValue = {
  id: string;
  name: string;
  formItemId: string;
  formDescriptionId: string;
  formMessageId: string;
  error?: { message?: string };
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

export const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);

  const { id } = itemContext;

  return {
    id,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldContext,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

export const FormFieldProvider = FormFieldContext.Provider;

export const FormItemProvider = FormItemContext.Provider; 