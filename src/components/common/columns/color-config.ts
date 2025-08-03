/**
 * Color definitions for different label types
 */
import { LABELS } from '@/constants/labels';

export const priorityColors: Record<string, string> = {
  p1: 'bg-[#FF0000] text-white',
  p2: 'bg-[#D10069] text-white',
  p3: 'bg-[#FACC15] text-black',
  p4: 'bg-[#FEF08A] text-black',
  p5: 'bg-[#0f766e] text-white',
  p6: 'bg-[#2dd4bf] text-black',
  p7: 'bg-[#99f6e4] text-black',
  p8: 'bg-[#dcfce7] text-black',
  p9: 'bg-[#f0fdf4] text-black',
};

export const statusColors: Record<string, string> = {
  [LABELS.BLOCKED]: 'bg-[#666666] text-white',
  [LABELS.IN_PROGRESS]: 'bg-[#1f7e23] text-white',
  [LABELS.PAUSED]: 'bg-[#fc9403] text-black',
  [LABELS.REVIEW]: 'bg-[#36454f] text-white',
};

export const mrLabelColors: Record<string, string> = {
  [LABELS.ACTION_REQUIRED]: 'bg-[#f7e7ce] text-black', // beige
  [LABELS.ACTION_REQUIRED2]: 'bg-[#8fbc8f] text-black', // green
  [LABELS.ACTION_REQUIRED3]: 'bg-[#8f0ced] text-white', // dark purple
  [LABELS.APPROVED]: 'bg-[#69d36e] text-black', // green
  [LABELS.BLOCKED]: 'bg-[#666666] text-white', // gray
  [LABELS.BUG]: 'bg-[#cc5842] text-white', // reddish-brown
  [LABELS.CLUSTER]: 'bg-[#4f97d3] text-white', // light blue
  [LABELS.CODE_REVIEW]: 'bg-[#4f97d3] text-white', // light blue
  [LABELS.COMMENT]: 'bg-[#666666] text-white', // gray
  [LABELS.DISCUSS]: 'bg-[#666666] text-white', // gray
  [LABELS.FEEDBACK]: 'bg-[#cc5842] text-white', // reddish-brown
  [LABELS.IN_PROGRESS]: 'bg-[#69d36e] text-white', // green
  [LABELS.MAINTENANCE]: 'bg-[#b5326e] text-white', // dark pink
  [LABELS.NOT_READY]: 'bg-[#666666] text-white', // gray
  [LABELS.PAUSED]: 'bg-[#ebc21b] text-black', // yellow
  [LABELS.QA_PRE_CHECK]: 'bg-[#ebc21b] text-black', // yellow
  [LABELS.REVIEW]: 'bg-[#344759] text-white', // dark blue
  [LABELS.STATUS_UPDATE_COMMIT]: 'bg-[#f0d87f] text-black', // beige
  [LABELS.TEAM1]: 'bg-[#cccccc] text-black', // light gray
  [LABELS.TEAM2]: 'bg-[#8e5bb5] text-white', // purple
  [LABELS.TEST]: 'bg-[#9784f5] text-black', // light purple
};
