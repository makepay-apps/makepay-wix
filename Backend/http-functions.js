import { notify } from 'backend/MakePay.js';

// If this file already contains functions, append this export and its import.
export async function post_makepay_notify(request) { return notify(request); }
