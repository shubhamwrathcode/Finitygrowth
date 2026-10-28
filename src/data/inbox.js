/**
 * NOTIFICATIONS and SUPPORT TICKETS (static sample).
 * type → which icon/colour the notification row uses (see NotificationsScreen).
 */
export const notifications = [
  { id: 'n1', type: 'credit', title: 'Package ROI credited', body: '9.45 USDT from 2 packages was added at 12:00 AM IST.', date: '2026-10-27', read: false },
  { id: 'n2', type: 'withdrawal', title: 'Withdrawal request received', body: '50.00 USDT is locked while admin reviews your request.', date: '2026-10-25', read: false },
  { id: 'n3', type: 'transfer', title: 'Transfer received', body: 'Neha Gupta sent you 15.00 USDT.', date: '2026-10-22', read: false },
  { id: 'n4', type: 'support', title: 'Support replied', body: 'Ticket #1042: “Your deposit has been credited.”', date: '2026-10-20', read: true },
  { id: 'n5', type: 'team', title: 'New direct referral', body: 'Karan Mehta joined with your code.', date: '2026-10-14', read: true },
  { id: 'n6', type: 'commission', title: 'Direct commission', body: 'You earned 25.00 USDT on Priya Nair’s first package.', date: '2026-10-05', read: true },
  { id: 'n7', type: 'level', title: 'Level 2 unlocked', body: 'You now earn 1% of Level 2 members’ nightly ROI.', date: '2026-10-05', read: true },
];

export const supportTickets = [
  {
    id: '1057',
    subject: 'When will my withdrawal be approved?',
    status: 'Open',
    createdOn: '2026-10-25',
    lastReply: 'We have received your request and it is in the review queue.',
    messages: 2,
  },
  {
    id: '1042',
    subject: 'Deposit not showing after 20 minutes',
    status: 'Closed',
    createdOn: '2026-09-10',
    lastReply: 'Your deposit has been credited.',
    messages: 4,
  },
];
