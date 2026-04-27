export const SESSION_TAGS = ['Work', 'Study', 'Reading', 'Chores', 'Deep Work'] as const;

export type SessionTag = (typeof SESSION_TAGS)[number];

export const DEFAULT_SESSION_TAG: SessionTag = 'Work';
