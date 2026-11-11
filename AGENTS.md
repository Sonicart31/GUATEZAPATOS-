<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Reports
- Generate seller exports in the browser from the existing RLS-protected query results, preparing blobs before download clicks to preserve mobile user activation.

## Authentication
- Keep account confirmation in Cloud Auth; validate repeated email locally without bypassing hosted confirmation.
- Password recovery uses Cloud Auth recovery OTP or recovery links on the public /reset-password page; never generate or store PINs locally.
- Personal transaction PINs are hashed in a private RLS-locked table; authenticated database functions verify them atomically with purchases and cancellations, preserving failed-attempt counters.
- Security monitoring displays persisted transaction-security events to sellers only; periodic refresh is not a full vulnerability scanner.
