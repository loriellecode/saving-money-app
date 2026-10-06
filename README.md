# Stack Saver

A simple savings app: create a goal, and it's **locked** until you've saved the full amount.

## How it works

1. **Create a goal.** Name it and set an amount, e.g. "New bike – $500". It starts out 🔒 locked.
2. **Buy stacks.** Add money in $10, $20, $50 or $100 stacks, or type in a custom amount.
   The app holds the money, and the "Held in vault" total at the top shows how much is held.
3. **Cash out when the goal is reached.** The cash-out button stays disabled until the
   saved amount reaches the goal. Then the goal becomes 🔓 unlocked and you can cash out the full amount.

Rules enforced by the app:

- You can't cash out a goal that's still locked.
- You can't delete a goal that's holding money, so deleting can't be used to get around the lock.
  A goal can be deleted only when it's empty or already cashed out.
- Each goal can be cashed out once. After that, it's closed and can't take more stacks.

## Screens

- **Welcome, sign in, create account, reset password**: shown when you're signed out.
- **Home**: total held in the vault, quick actions (buy stack, new goal, cash out, activity),
  your goals with progress, and a feed of recent stacks and cash-outs.
- **Goal**: progress toward the goal, lock status, stack history, and the cash-out button.
- **Buy a stack**: pick a goal, tap a quick stack ($10/$20/$50/$100 or "finish goal") or type any
  amount on the keypad.
- **New goal**: name it, enter the amount on the keypad, create it locked.

It's a phone-style web app. On a desktop it appears in a phone frame, and on a phone it fills the screen.

## Run it

```sh
npm start
```

Then open http://localhost:3000. There are no dependencies to install; the Supabase client loads from a CDN.
On a computer, you can also type amounts with your keyboard.

Use `npm start`, not a double-click on `index.html`. Supabase's confirmation and password-reset emails link back
to `http://localhost:3000`, so the app needs to be served from there.

## Accounts and data (Supabase)

Sign-in uses Supabase Auth with email and password, including sign-up with email confirmation, password reset, and sign-out.
Each account's goals and stacks are stored in the `stack-saver` Supabase project. The URL and publishable key are in `config.js`.
The publishable key is safe to ship in the page, because the database decides what each user can do.

The rules are enforced by the database, not just the app (see `supabase/migrations/`):

- Row level security: each user can see and add only their own goals and stacks. Signed-out visitors can see nothing.
- Goals can't be edited directly. Cashing out goes through the `cash_out()` function, which refuses until the stacks add up to the goal.
- Stacks can't be edited or deleted after they're bought.
- A goal can be deleted only when it's empty or already cashed out.

### Supabase settings to check

In the Supabase dashboard, under **Authentication**:

- **URL Configuration**: the Site URL defaults to `http://localhost:3000`, which matches `npm start`.
  When you put the app online, set the Site URL to that address and add it under **Redirect URLs**.
- **Emails**: Supabase's built-in email service is for testing only. It sends a few emails per hour, and only to
  members of your Supabase organization. Before real people sign up, set up custom SMTP under **Emails → SMTP Settings**.
  For quick testing, you can instead turn off **Confirm email** under **Sign In / Providers → Email**.

## Tests

```sh
npm test
```

The goal and lock rules are in `savings.js`, which has no DOM code, and are tested in `savings.test.js`.
The same rules are enforced again by the database.

## Note on real money

This version tracks savings and doesn't move real money. Accepting payments and holding real funds
would need a payment provider (e.g. Stripe), a backend with user accounts, and a licensed partner
to hold the money (holding customers' funds is regulated).
