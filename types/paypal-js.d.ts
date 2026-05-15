export {};

declare global {
  interface Window {
    paypal?: {
      Buttons?: (options: PayPalButtonsOptions) => PayPalRenderable;
      CardFields?: (options: PayPalCardFieldsOptions) => PayPalCardFields;
    };
  }
}

type PayPalOrderData = {
  orderID?: string;
  orderId?: string;
};

type PayPalButtonsOptions = {
  style?: Record<string, string>;
  createOrder: () => Promise<string>;
  onApprove: (data: PayPalOrderData) => Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

type PayPalCardFieldsOptions = {
  createOrder: () => Promise<string>;
  onApprove: (data: PayPalOrderData) => Promise<void>;
  onError?: (error: unknown) => void;
};

type PayPalRenderable = {
  render: (container: string | HTMLElement) => Promise<void> | void;
};

type PayPalCardField = {
  render: (container: string | HTMLElement) => Promise<void> | void;
};

type PayPalCardFields = {
  isEligible: () => boolean;
  NameField: () => PayPalCardField;
  NumberField: () => PayPalCardField;
  ExpiryField: () => PayPalCardField;
  CVVField: () => PayPalCardField;
  submit: () => Promise<void>;
};
