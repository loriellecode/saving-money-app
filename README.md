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

- **Welcome**: shown the first time, before you have any goals.
- **Home**: total held in the vault, quick actions (buy stack, new goal, cash out, activity),
  your goals with progress, and a feed of recent stacks and cash-outs.
- **Goal**: progress toward the goal, lock status, stack history, and the cash-out button.
- **Buy a stack**: pick a goal, tap a quick stack ($10/$20/$50/$100 or "finish goal") or type any
  amount on the keypad.
- **New goal**: name it, enter the amount on the keypad, create it locked.

It's a phone-style web app. On a desktop it appears in a phone frame, and on a phone it fills the screen.

## Run it

No install or build step. Open `index.html` in a browser. On a computer, you can also type amounts with your keyboard.

Data is saved in your browser's `localStorage`, on this device only.

## Tests

```sh
npm test
```

The goal and lock rules are in `savings.js`, which has no DOM code, and are tested in `savings.test.js`.

## Note on real money

This version tracks savings and doesn't move real money. Accepting payments and holding real funds
would need a payment provider (e.g. Stripe), a backend with user accounts, and a licensed partner
to hold the money (holding customers' funds is regulated).
