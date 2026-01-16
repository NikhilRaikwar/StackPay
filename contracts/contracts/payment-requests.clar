;; StacksPay Pro - Enhanced Payment Requests Contract
;; Manages both escrow payments and invoice requests with full event tracking

;; Define constants
(define-constant usdcx-contract 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx)
(define-constant contract-owner tx-sender)

;; Error codes
(define-constant err-not-authorized (err u401))
(define-constant err-not-found (err u404))
(define-constant err-already-claimed (err u400))
(define-constant err-invalid-amount (err u402))
(define-constant err-transfer-failed (err u405))
(define-constant err-already-exists (err u406))

;; Payment request types
(define-constant type-escrow "escrow")
(define-constant type-invoice "invoice")

;; Define data maps
(define-map payment-requests
  { request-id: (string-ascii 36) }
  {
    creator: principal,
    recipient: principal,
    amount: uint,
    memo: (string-utf8 256),
    request-type: (string-ascii 10),
    status: (string-ascii 10),
    created-at: uint,
    created-at-burn-height: uint,
    claimed-at: (optional uint),
    claimed-at-burn-height: (optional uint)
  }
)

;; Track payments per user
(define-map user-payment-count
  { user: principal }
  { count: uint }
)

;; Define data vars for tracking
(define-data-var total-payments-created uint u0)
(define-data-var total-payments-claimed uint u0)
(define-data-var total-volume uint u0)

;; ============================================
;; ESCROW MODE: Lock funds when creating request
;; ============================================

;; Create a payment request and Lock funds (Escrow)
(define-public (create-payment-request
    (request-id (string-ascii 36))
    (recipient principal)
    (amount uint)
    (memo (string-utf8 256)))
  (begin
    ;; Validate amount
    (asserts! (> amount u0) err-invalid-amount)
    
    ;; Check request doesn't already exist
    (asserts! (is-none (map-get? payment-requests { request-id: request-id })) err-already-exists)

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
        request-type: type-escrow,
        status: "pending",
        created-at: stacks-block-height,
        created-at-burn-height: burn-block-height,
        claimed-at: none,
        claimed-at-burn-height: none
      }
    )

    ;; Update user payment count
    (map-set user-payment-count
      { user: tx-sender }
      { count: (+ (get-user-payment-count tx-sender) u1) }
    )

    ;; Increment counters
    (var-set total-payments-created (+ (var-get total-payments-created) u1))
    (var-set total-volume (+ (var-get total-volume) amount))

    ;; Emit event
    (print {
      event: "payment-request-created",
      request-id: request-id,
      request-type: type-escrow,
      creator: tx-sender,
      recipient: recipient,
      amount: amount,
      memo: memo,
      stacks-block: stacks-block-height,
      bitcoin-block: burn-block-height
    })

    (ok request-id)
  )
)

;; ============================================
;; INVOICE MODE: Create request without locking funds
;; ============================================

;; Create an invoice (payment request without escrow)
(define-public (create-invoice-request
    (request-id (string-ascii 36))
    (amount uint)
    (memo (string-utf8 256)))
  (begin
    ;; Validate amount
    (asserts! (> amount u0) err-invalid-amount)
    
    ;; Check request doesn't already exist
    (asserts! (is-none (map-get? payment-requests { request-id: request-id })) err-already-exists)

    ;; Store invoice request (no funds locked)
    (map-set payment-requests
      { request-id: request-id }
      {
        creator: tx-sender,
        recipient: tx-sender,  ;; Creator is recipient for invoices
        amount: amount,
        memo: memo,
        request-type: type-invoice,
        status: "pending",
        created-at: stacks-block-height,
        created-at-burn-height: burn-block-height,
        claimed-at: none,
        claimed-at-burn-height: none
      }
    )

    ;; Update user payment count
    (map-set user-payment-count
      { user: tx-sender }
      { count: (+ (get-user-payment-count tx-sender) u1) }
    )

    ;; Increment counter
    (var-set total-payments-created (+ (var-get total-payments-created) u1))

    ;; Emit event
    (print {
      event: "invoice-created",
      request-id: request-id,
      request-type: type-invoice,
      creator: tx-sender,
      amount: amount,
      memo: memo,
      stacks-block: stacks-block-height,
      bitcoin-block: burn-block-height
    })

    (ok request-id)
  )
)

;; Pay an invoice (direct transfer to creator)
(define-public (pay-invoice (request-id (string-ascii 36)))
  (let (
    (request (unwrap! (map-get? payment-requests { request-id: request-id }) err-not-found))
    (creator (get creator request))
    (amount (get amount request))
  )
    ;; Verify it's an invoice type
    (asserts! (is-eq (get request-type request) type-invoice) err-not-authorized)
    
    ;; Verify status is pending
    (asserts! (is-eq (get status request) "pending") err-already-claimed)

    ;; Transfer USDCx directly from payer to creator
    (unwrap! (contract-call? usdcx-contract transfer amount tx-sender creator none) err-transfer-failed)

    ;; Update status
    (map-set payment-requests
      { request-id: request-id }
      (merge request {
        status: "paid",
        claimed-at: (some stacks-block-height),
        claimed-at-burn-height: (some burn-block-height)
      })
    )

    ;; Increment counters
    (var-set total-payments-claimed (+ (var-get total-payments-claimed) u1))
    (var-set total-volume (+ (var-get total-volume) amount))

    ;; Emit event
    (print {
      event: "invoice-paid",
      request-id: request-id,
      payer: tx-sender,
      creator: creator,
      amount: amount,
      stacks-block: stacks-block-height,
      bitcoin-block: burn-block-height
    })

    (ok true)
  )
)

;; ============================================
;; ESCROW MODE: Claim functions
;; ============================================

;; Claim a payment (recipient only) - Release funds from Escrow
(define-public (claim-payment (request-id (string-ascii 36)))
  (let (
    (request (unwrap! (map-get? payment-requests { request-id: request-id }) err-not-found))
    (recipient (get recipient request))
    (amount (get amount request))
    (creator (get creator request))
  )
    ;; Verify it's escrow type
    (asserts! (is-eq (get request-type request) type-escrow) err-not-authorized)
    
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
        claimed-at: (some stacks-block-height),
        claimed-at-burn-height: (some burn-block-height)
      })
    )

    ;; Increment counter
    (var-set total-payments-claimed (+ (var-get total-payments-claimed) u1))

    ;; Emit event
    (print {
      event: "payment-claimed",
      request-id: request-id,
      recipient: recipient,
      creator: creator,
      amount: amount,
      stacks-block: stacks-block-height,
      bitcoin-block: burn-block-height
    })

    (ok true)
  )
)

;; Cancel a payment request (creator only, if not claimed) - Refund
(define-public (cancel-payment-request (request-id (string-ascii 36)))
  (let (
    (request (unwrap! (map-get? payment-requests { request-id: request-id }) err-not-found))
    (creator (get creator request))
    (amount (get amount request))
    (request-type (get request-type request))
  )
    ;; Verify creator
    (asserts! (is-eq tx-sender creator) err-not-authorized)

    ;; Verify status
    (asserts! (is-eq (get status request) "pending") err-already-claimed)

    ;; Handle refund for escrow type only
    (if (is-eq request-type type-escrow)
      (begin
        ;; Refund USDCx from Contract to Creator
        (as-contract (unwrap! (contract-call? usdcx-contract transfer amount tx-sender creator none) err-transfer-failed))
      )
      ;; For invoices, just update status (no refund needed)
      true
    )

    ;; Update status
    (map-set payment-requests
      { request-id: request-id }
      (merge request { status: "cancelled" })
    )

    ;; Emit event
    (print {
      event: "payment-cancelled",
      request-id: request-id,
      creator: creator,
      request-type: request-type,
      amount: amount,
      stacks-block: stacks-block-height,
      bitcoin-block: burn-block-height
    })

    (ok true)
  )
)

;; ============================================
;; Read-only functions
;; ============================================

(define-read-only (get-payment-request (request-id (string-ascii 36)))
  (map-get? payment-requests { request-id: request-id })
)

(define-read-only (get-total-payments-created)
  (ok (var-get total-payments-created))
)

(define-read-only (get-total-payments-claimed)
  (ok (var-get total-payments-claimed))
)

(define-read-only (get-total-volume)
  (ok (var-get total-volume))
)

(define-read-only (get-user-payment-count (user principal))
  (default-to u0 (get count (map-get? user-payment-count { user: user })))
)

;; Get payment status
(define-read-only (get-payment-status (request-id (string-ascii 36)))
  (match (map-get? payment-requests { request-id: request-id })
    request (ok (get status request))
    err-not-found
  )
)

;; Check if payment is claimable by a specific user
(define-read-only (is-claimable (request-id (string-ascii 36)) (user principal))
  (match (map-get? payment-requests { request-id: request-id })
    request (ok (and 
      (is-eq (get recipient request) user)
      (is-eq (get status request) "pending")
      (is-eq (get request-type request) type-escrow)
    ))
    err-not-found
  )
)

;; Check if invoice is payable
(define-read-only (is-payable (request-id (string-ascii 36)))
  (match (map-get? payment-requests { request-id: request-id })
    request (ok (and 
      (is-eq (get status request) "pending")
      (is-eq (get request-type request) type-invoice)
    ))
    err-not-found
  )
)