# Learn 07 - Formal Message

A Formal Message is an authorised message form that may be transmitted over the air.

Formal Message has 3 parts:

- HEADING (Precedence Action, Precedence Info, DTG, From, To, Info)
- TEXT (Security Classification, Originator no., Message)
- ENDING (For Operator administration only, need not transmit over the air)

The prowords are...

- FORMAL MESSAGE,
- BREAK x 2 (for end of HEADING, and end of TEXT),
- ROGER SO FAR x 1 or 2 (for HEADING, and TEXT that may take more than 30s to send).

Example:
- HULLO B19, C59, and D89, this is A00, PRIORITY FORMAL MESSAGE OVER.
- B19/C59/D89, SEND OVER.
- A00, PRIORITY ROUTINE 160900H JUL 06 from A19 to B19 and C59 info D89 BREAK, ROGER SO FAR OVER.
- Note: Above Precedence PRIORITY (For action addressee B19, C59), ROUTINE (For info addressee D89).
- B19/C59/D89, ROGER OVER.
- A00, RESTRICTED, Quebec oblique 006. resupply will be reaching your harbour locations at 171800H and depart at 172000H, ROGER SO FAR OVER.
- B19/C59/D89, ROGER OVER.
- A00, prepare your MOLAR to for resupply BREAK, OVER.
- B19/C59/D89, ROGER OUT.

## Precedence Category:
- FLASH (Less than 10 mins)
- IMMEDIATE (Up to 1 hour)
- PRIORITY (Up to 6 hours)
- ROUTINE (24 hours)

## Security Classification:
- TOP SECRET
- SECRET
- CONFIDENTIAL
- RESTRICTED
- UNCLASSIFIED
