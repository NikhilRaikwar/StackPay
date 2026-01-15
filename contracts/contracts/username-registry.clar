;; StacksPay Pro - Username Registry
;; Maps usernames to Stacks addresses

(define-constant err-username-taken (err u100))
(define-constant err-username-not-found (err u101))
(define-constant err-invalid-username (err u102))

;; Maps username to address
(define-map usernames
  { username: (string-ascii 20) }
  { owner: principal, registered-at: uint }
)

;; Maps address to username (reverse lookup)
(define-map addresses
  { owner: principal }
  { username: (string-ascii 20) }
)

;; Register a username
(define-public (register-username (username (string-ascii 20)))
  (begin
    ;; Check username length (3-20 chars)
    (asserts! (>= (len username) u3) err-invalid-username)

    ;; Check if username is available
    (asserts! (is-none (map-get? usernames { username: username })) err-username-taken)

    ;; Register username
    (map-set usernames
      { username: username }
      { owner: tx-sender, registered-at: stacks-block-height }
    )

    ;; Set reverse lookup
    (map-set addresses
      { owner: tx-sender }
      { username: username }
    )

    (ok username)
  )
)

;; Read-only: Get address by username
(define-read-only (get-address (username (string-ascii 20)))
  (match (map-get? usernames { username: username })
    entry (ok (get owner entry))
    err-username-not-found
  )
)

;; Read-only: Get username by address
(define-read-only (get-username (owner principal))
  (match (map-get? addresses { owner: owner })
    entry (ok (get username entry))
    err-username-not-found
  )
)