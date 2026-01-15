;; StacksPay Pro - Payment Requests Contract
;; Manages payment requests with QR code functionality and Escrow

;; Define constants
(define-constant usdcx-contract 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx)
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u401))
(define-constant err-not-found (err u404))
(define-constant err-already-claimed (err u400))
(define-constant err-invalid-amount (err u402))
(define-constant err-transfer-failed (err u405))

;; Define data maps
(define-map payment-requests
  { request-id: (string-ascii 36) }
  {
    creator: principal,
    recipient: principal,
    amount: uint,
    memo: (string-utf8 256),
    status: (string-ascii 10),
    created-at: uint,
    claimed-at: (optional uint)
  }
)

;; Define data var for tracking total payments
(define-data-var total-payments-created uint u0)
(define-data-var total-payments-claimed uint u0)

;; Create a payment request and Lock funds (Escrow)
(define-public (create-payment-request
    (request-id (string-ascii 36))
    (recipient principal)
    (amount uint)
    (memo (string-utf8 256)))
  (begin
    ;; Validate amount
    (asserts! (> amount u0) err-invalid-amount)

    ;; Transfer funds from Creator to Contract (Escrow)
    (unwrap! (contract-call? usdcx-contract transfer amount tx-sender (as-contract tx-sender) none) err-transfer-failed)

    ;; Store payment request
    (map-set payment-requests
      { request-id: request-id }
      {
        creator: tx-sender,
        recipient: recipient,
        amount: amount,
        memo: memo,
        status: "pending",
        created-at: stacks-block-height,
        claimed-at: none
      }
    )

    ;; Increment counter
    (var-set total-payments-created (+ (var-get total-payments-created) u1))

    (ok request-id)
  )
)

;; Claim a payment (recipient only) - Release funds from Escrow
(define-public (claim-payment (request-id (string-ascii 36)))
  (let (
    (request (unwrap! (map-get? payment-requests { request-id: request-id }) err-not-found))
    (recipient (get recipient request))
    (amount (get amount request))
  )
    ;; Verify recipient
    (asserts! (is-eq tx-sender recipient) err-not-authorized)

    ;; Verify status
    (asserts! (is-eq (get status request) "pending") err-already-claimed)

    ;; Transfer USDCx from Contract to Recipient
    (as-contract (unwrap! (contract-call? usdcx-contract transfer amount tx-sender recipient none) err-transfer-failed))

    ;; Update status
    (map-set payment-requests
      { request-id: request-id }
      (merge request {
        status: "completed",
        claimed-at: (some stacks-block-height)
      })
    )

    ;; Increment counter
    (var-set total-payments-claimed (+ (var-get total-payments-claimed) u1))

    (ok true)
  )
)

;; Cancel a payment request (creator only, if not claimed) - Refund
(define-public (cancel-payment-request (request-id (string-ascii 36)))
  (let (
    (request (unwrap! (map-get? payment-requests { request-id: request-id }) err-not-found))
    (creator (get creator request))
    (amount (get amount request))
  )
    ;; Verify creator
    (asserts! (is-eq tx-sender creator) err-not-authorized)

    ;; Verify status
    (asserts! (is-eq (get status request) "pending") err-already-claimed)

    ;; Refund USDCx from Contract to Creator
    (as-contract (unwrap! (contract-call? usdcx-contract transfer amount tx-sender creator none) err-transfer-failed))

    ;; Update status
    (map-set payment-requests
      { request-id: request-id }
      (merge request { status: "cancelled" })
    )

    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-payment-request (request-id (string-ascii 36)))
  (map-get? payment-requests { request-id: request-id })
)

(define-read-only (get-total-payments-created)
  (ok (var-get total-payments-created))
)

(define-read-only (get-total-payments-claimed)
  (ok (var-get total-payments-claimed))
)