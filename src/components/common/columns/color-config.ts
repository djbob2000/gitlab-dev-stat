/**
 * Color definitions for different label types
 */

export const priorityColors: Record<string, string> = {
  p1: 'bg-[#db3b21] text-white',
  p2: 'bg-[#cc338b] text-white',
  p3: 'bg-[#fc9403] text-black',
  p4: 'bg-[#f4c404] text-black',
  p5: 'bg-[#1f7e23] text-white',
  p6: 'bg-[#2da160] text-white',
  p7: 'bg-[#2da160] text-white',
  p8: 'bg-[#aaaaaa] text-black',
};

export const statusColors: Record<string, string> = {
  blocked: 'bg-[#666666] text-white',
  'in-progress': 'bg-[#1f7e23] text-white',
  paused: 'bg-[#fc9403] text-black',
  review: 'bg-[#0d0d0d] text-white',
};

export const mrLabelColors: Record<string, string> = {
  'action-required': 'bg-[#dbc8a0] text-black', // beige
  'action-required2': 'bg-[#4f97d3] text-black', // blue
  'action-required3': 'bg-[#8f0ced] text-white', // dark purple
  approved: 'bg-[#69d36e] text-black', // green
  blocked: 'bg-[#666666] text-white', // gray
  bug: 'bg-[#cc5842] text-white', // reddish-brown
  cluster: 'bg-[#4f97d3] text-white', // light blue
  'code-review': 'bg-[#4f97d3] text-white', // light blue
  comment: 'bg-[#666666] text-white', // gray
  discuss: 'bg-[#666666] text-white', // gray
  feedback: 'bg-[#cc5842] text-white', // reddish-brown
  'in-progress': 'bg-[#69d36e] text-white', // green
  maintenance: 'bg-[#b5326e] text-white', // dark pink
  'not-ready': 'bg-[#666666] text-white', // gray
  paused: 'bg-[#ebc21b] text-black', // yellow
  'qa-pre-check': 'bg-[#ebc21b] text-black', // yellow
  review: 'bg-[#344759] text-white', // dark blue
  'status-update-commit': 'bg-[#dbc8a0] text-black', // beige
  team1: 'bg-[#cccccc] text-black', // light gray
  team2: 'bg-[#8e5bb5] text-white', // purple
};
