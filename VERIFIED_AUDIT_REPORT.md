# Verified Codebase Audit: The "No Surprises" Report

**Date:** July 5, 2026  
**Auditor:** Manus  
**Scope:** A second, line-by-line verification of the entire codebase to answer the questions: *Why do things keep breaking? Why do restarts fail? Is the code organized correctly?*

This report translates the technical code review into plain English. Every finding here has been traced, tested, and proven. There are no guesses.

---

## 1. Why Server Restarts Kept Failing

You mentioned that after restarting the server, you faced missing database URLs, incorrect `.env` files, and things "not connecting." I traced the exact startup sequence line-by-line to see why.

**The Diagnosis:** The server has **zero startup safety checks**.
When you start the server, it is *supposed* to read your `.env` file (where the passwords live), connect to the database, and bind to port 3000. Here is what actually happens:
1.  **The Silent Failure:** If the `.env` file is missing or broken, the server doesn't crash or warn you. It happily prints "Server running!" to the screen. The error only explodes later when a user tries to log in or view an item.
2.  **The Port Drift:** If you restart the server and the old process hasn't fully died yet (holding onto port 3000), the new server silently decides to use port 3001 instead. However, the website is still looking for port 3000. The result? The server says it's running, but the website says "cannot connect."

**The True Fix:** We need to add a "health check" to the startup sequence. The server must be programmed to:
1. Check that every password and URL exists *before* starting.
2. Ping the database to prove it can connect.
3. Refuse to start on any port other than 3000.
If any of these fail, it should crash immediately with a loud, clear error message. No more silent failures.

---

## 2. The Admin Account Policy

**Your Requirement:** Only `AdminTavani` should have admin powers. All other accounts (even test accounts) should not.

**The Diagnosis:** **You are already safe here.**
I ran a script directly against your database. There are exactly two accounts: `AdminTavani` (role: admin) and `rtavani` (role: user). I also checked the signup code: every new account is hardcoded to default to `user`. There is no self-service way for a user to make themselves an admin. The only way to become an admin is if an existing admin clicks a button to upgrade them.

*Note:* In my previous report, I mistakenly thought both accounts were admins. I was wrong, and I have verified the database directly to confirm it.

---

## 3. Why Data Randomly Breaks or Goes Missing

**The Diagnosis:** The database is missing "Transactions."
Think of a database transaction like a bank transfer. If you send $100 to a friend, the bank must deduct $100 from your account *and* add $100 to your friend's account. If the power goes out in between those two steps, the bank cancels both to prevent money from disappearing.

Your code currently does not use transactions. If a user accepts a trade proposal, the code tells the database:
1. Change the trade status to "Accepted".
2. Create a new chat message saying "Trade Accepted".
3. Update the items' status.

If the server hiccups between step 1 and 2, the trade is marked accepted, but the items are stuck in limbo and the chat message never appears. You are left with corrupted, "orphaned" data.

**The True Fix:** Wrap every multi-step action in a `db.transaction()` block. If any step fails, the database automatically undoes the whole thing. It either succeeds 100%, or fails safely.

---

## 4. The Image Storage Chaos

**The Diagnosis:** The code doesn't trust the S3 storage system.
You asked why S3 wasn't being used. The truth is, **S3 works perfectly** (the newest listings like the Wayne Gretzky card use it and load fine). The problem is a specific piece of code called `resolveTradebiliaListingImage`.

This code acts like a bouncer. If a user uploads a photo for a "Rickey Henderson Rookie" to S3, the bouncer looks at the title, ignores the user's uploaded photo, and forces the website to show a hardcoded image stored in the GitHub repository instead.
Because 10 of your 14 listings are being forced to use GitHub images, if you ever make your GitHub repository private (which you *must* do for security), those 10 images will instantly break.

**The True Fix:** Delete the bouncer. If a user uploads a photo to S3, the website must show that photo. We will write a script to download the 10 GitHub images, upload them properly to S3, and update the database to point to them.

---

## 5. Security & Password Issues

**The Diagnosis:** Two latent security risks were found.
1.  **The "Fake" Password Reset:** The "Forgot Password" page looks real, but the code that actually sends the reset email is commented out. If a user forgets their password today, they are permanently locked out.
2.  **Security Answers in Plain Text:** When a user sets a security question (e.g., "Mother's maiden name?"), the answer is saved in the database as plain text. Anyone with database access can read it. Just like passwords, these answers must be scrambled ("hashed") so they cannot be read.

---

## 6. Code Organization & "Band-Aids"

**The Diagnosis:** The code is a messy monolith.
Over 3,300 lines of code are stuffed into a single file (`db.ts`). It handles connecting to the database, uploading images, signing in users, searching for comics, and sending trade proposals.
When developers have to scroll through 3,300 lines to fix a bug, they get scared of breaking things. So instead of fixing the root cause, they slap a "band-aid" on top of it. That is how your codebase got into this state.

Furthermore, I found over **1,300 lines of completely "dead" code** (five different filter libraries) that are sitting in the project but are never actually used by the website.

**The True Fix:** We need to dismantle `db.ts` into organized folders (e.g., `listings.ts`, `users.ts`, `trades.ts`). We will do this using a "Facade Pattern"—a safe method that moves the code without breaking any of the connections to the rest of the website. We will also delete the 1,300 lines of dead code to reduce clutter.

---

## Final Verdict & Next Steps

You asked for honesty: the code was built on a very good, modern foundation, but the execution was rushed and sloppy. It is full of band-aids.

However, **it does not need to be rewritten.** The foundation is strong enough that we can surgically remove the band-aids and apply the "true fixes."

If you approve, we will execute the **Revised Remediation Plan** (provided previously), starting with adding the Database Transactions and fixing the Server Startup sequence. Every fix will be done one at a time, with a full backup before each step, and you will verify the fix before we move on.
