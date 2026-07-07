---
name: pasarela_mercadopago
description: Skill for maintaining and expanding the MercadoPago Payment Bricks checkout integration. Follow these rules for all MP related components.
---

# Pasarela MercadoPago - Checkout Bricks

This project uses the MercadoPago `@mercadopago/sdk-react` integration to render a **Payment Brick** directly on the site, replacing the previous `Checkout Pro` (redirect) flow.

## Architecture

1.  **Frontend (`step-payment.tsx`)**
    *   Initializes MercadoPago with `initMercadoPago(NEXT_PUBLIC_MP_PUBLIC_KEY)` at module level.
    *   Uses the `<Payment />` component which renders an iframe inside a secure DOM node.
    *   `onSubmit` callback receives `formData` containing sensitive tokenized payment info (`token`, `payment_method_id`, `issuer_id`, etc.).
    *   **Crucial:** The frontend *never* knows the raw credit card numbers. It only handles the `token`.
    *   The frontend wraps `formData` along with our internal `orderData` (cart items, shipping info, coupon) and sends it to our unificated `POST /payments/process` endpoint.

2.  **Backend (`paymentsController.ts`)**
    *   Receives the merged `formData` and `orderData`.
    *   Validates stock and creates a local DB `Order`.
    *   Uses `paymentClient.create()` from `mercadopago` Node.js SDK to process the payment with the Brick's `formData`.
    *   Must always include an `X-Idempotency-Key` (using `uuidv4()`) in the `requestOptions` to prevent duplicate charges in case of network retries.
    *   Handles immediate responses:
        *   `approved`: Mark order as paid, release stock.
        *   `rejected`: Mark order as failed, restore stock.
        *   `pending` / `in_process`: Handled asynchronously via Webhooks.

3.  **Webhooks (`POST /payments/webhook`)**
    *   MercadoPago asynchronously pings this endpoint when payment statuses change.
    *   Fetches the actual payment info from MP using the `data.id`.
    *   Updates the local DB order status accordingly.

## Best Practices & Rules for Future Modifications

*   **Idempotency is Mandatory:** Never call `paymentClient.create()` without generating a unique `idempotencyKey` per attempt.
*   **Security:** Never expose `MP_ACCESS_TOKEN` to the frontend. It must only exist in the backend `.env`. The frontend only uses `MP_PUBLIC_KEY`.
*   **Stock Management:** Always reserve stock *before* attempting the charge. If the charge fails or throws an exception, always wrap the call in a `try/catch` and restore the stock in the `catch` or on a `rejected` status.
*   **Amount Formatting:** MercadoPago expects `transaction_amount` as a number (float or int). Do not send formatted strings.
*   **UI/UX:** The Payment Brick manages its own loading states while tokenizing. However, the `onSubmit` promise resolution dictates the final UX. Return a promise or await the fetch request so the Brick shows its built-in success/failure animations before you redirect the user.

## Adding New Bricks (e.g. Wallet)

If we ever want to add the `Wallet` brick (which redirects to the MP app but is initiated from our site):
1. Import `Wallet` from `@mercadopago/sdk-react`.
2. Generate a `preferenceId` in the backend first.
3. Pass that `preferenceId` to the Wallet component's `initialization` prop.
