# Store access token and access token secret in browser's SessionStorage

Don't authenticate each time. This is a better user experience and it makes
testing easier, and it might reduce the chance of Twitter's mysterious app
limiting system from getting triggered by testing.


# Check rate limits before executing API calls

To avoid errors and to reduce the risk of violating mysterious unpublished 
rules that cause app limiting, check the rate limit api before any batch of
other API calls, and don't exceed the rate limit.


# Handle large batches better

Large batches have silent failures.

Change interaction flow so the final page does more work.

After authentication, redirect to html page with client-side JavaScript in it, 
including user's API credentials and the full list accounts they asked to block.

Using client-side JavaScript timers and ajax calls to the blockasaurus server,
organize the block list into small batches to send to the server and block, and
display the success or failure response from twitter for each attempted block. 
Update the status of each requested block on the page in real time, in a table.

Display text that the page is still doing work, so do not navigate away from 
the page yet, or the blocking process will be interrupted.

Client-side JavaScript continues making calls as needed to try to block every 
requested account and verify that it has been blocked, until all requested
block actions are successful, or all remaining failed blocks failed because
the specified account was not found.

Check rate limits on the relevant API calls. Display them to the user.

Use spinner graphics for block requests that are still pending.


# Accept numerical user ids 

Add a checkbox "These are numerical user ids, not @ screen names"

