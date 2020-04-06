import { generateUuid } from 'back-end/lib';
import { Connection, Transaction, tryDb } from 'back-end/lib/db';
import { readOneFileById } from 'back-end/lib/db/file';
import { readOneCWUOpportunitySlim, updateCWUOpportunityStatus } from 'back-end/lib/db/opportunity/code-with-us';
import { readOneOrganization } from 'back-end/lib/db/organization';
import { readOneUserSlim } from 'back-end/lib/db/user';
import { readCWUProposalHistory, readCWUProposalScore, readOneCWUProposal as hasReadPermissionCWUProposal } from 'back-end/lib/permissions';
import { valid } from 'shared/lib/http';
import { FileRecord } from 'shared/lib/resources/file';
import { CWUOpportunityStatus, publicOpportunityStatuses } from 'shared/lib/resources/opportunity/code-with-us';
import { Organization } from 'shared/lib/resources/organization';
import { CreateCWUProposalStatus, CreateIndividualProponentRequestBody, CWUIndividualProponent, CWUProposal, CWUProposalEvent, CWUProposalHistoryRecord, CWUProposalSlim, CWUProposalStatus, isCWUProposalStatusVisibleToGovernment, isRankableCWUProposalStatus, UpdateProponentRequestBody } from 'shared/lib/resources/proposal/code-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { User, UserType } from 'shared/lib/resources/user';
import { ADT, adt, Id } from 'shared/lib/types';
import { getValidValue, isInvalid } from 'shared/lib/validation';

interface CreateCWUProposalParams {
  opportunity: Id;
  proposalText: string;
  additionalComments: string;
  proponent: ADT<'individual', CreateIndividualProponentRequestBody> | ADT<'organization', Id>;
  attachments: FileRecord[];
  status: CreateCWUProposalStatus;
}

interface UpdateCWUProposalParams extends Partial<Omit<CWUProposal, 'createdBy' | 'updatedBy' | 'opportunity' | 'proponent'>> {
  createdBy?: Id;
  updatedBy?: Id;
  proponent: UpdateProponentRequestBody;
}

interface RawCWUProposal extends Omit<CWUProposal, 'createdBy' | 'updatedBy' | 'proponent' | 'opportunity' | 'attachments'> {
  createdBy: Id;
  updatedBy: Id;
  opportunity: Id;
  proponentIndividual?: Id | null;
  proponentOrganization?: Id | null;
  attachments: Id[];
}

interface RawCWUProposalSlim extends Omit<CWUProposalSlim, 'createdBy' | 'updatedBy' | 'proponent'> {
  createdBy: Id;
  updatedBy: Id;
  proponentIndividual?: Id | null;
  proponentOrganization?: Id | null;
}

interface RawCWUProposalHistoryRecord extends Omit<CWUProposalHistoryRecord, 'createdBy' | 'type'> {
  createdBy: Id | null;
  status?: CWUProposalStatus;
  event?: CWUProposalEvent;
}

async function rawCWUProposalToCWUProposal(connection: Connection, session: Session, raw: RawCWUProposal): Promise<CWUProposal> {
  const { opportunity: opportunityId, attachments: attachmentIds, proposalText, additionalComments, history, ...restOfProposal } = raw;
  const slimVersion = await rawCWUProposalSlimToCWUProposalSlim(connection, restOfProposal);
  const opportunity = getValidValue(await readOneCWUOpportunitySlim(connection, opportunityId, session), null);
  if (!opportunity) {
    throw new Error('unable to process proposal opportunity');
  }
  let attachments: FileRecord[];
  if (attachmentIds) {
    attachments = await Promise.all(attachmentIds.map(async id => {
      const result = getValidValue(await readOneFileById(connection, id), null);
      if (!result) {
        throw new Error('unable to process proposal attachments'); // to be caught by calling function
      }
      return result;
    }));
  } else {
    attachments = [];
  }

  return {
    ...slimVersion,
    proposalText,
    additionalComments,
    opportunity,
    attachments,
    history
  };
}

async function rawCWUProposalSlimToCWUProposalSlim(connection: Connection, raw: RawCWUProposalSlim): Promise<CWUProposalSlim> {
  const { createdBy: createdById,
          updatedBy: updatedById,
          proponentIndividual: proponentIndividualId,
          proponentOrganization: proponentOrganizationId,
          ...restOfRaw
        } = raw;

  const createdBy = getValidValue(await readOneUserSlim(connection, createdById), undefined);
  const updatedBy = getValidValue(await readOneUserSlim(connection, updatedById), undefined);
  const proponentIndividual = proponentIndividualId ? getValidValue(await readOneCWUProponent(connection, proponentIndividualId), undefined) : null;
  const proponentOrganization = proponentOrganizationId ? getValidValue(await readOneOrganization(connection, proponentOrganizationId), undefined) : null;

  if (!createdBy || !updatedBy) {
    throw new Error('unable to process proposal');
  }

  let proponent: ADT<'individual', CWUIndividualProponent> | ADT<'organization', Organization>;
  if (proponentIndividual) {
    proponent = adt('individual', proponentIndividual);
  } else if (proponentOrganization) {
    proponent = adt('organization', proponentOrganization);
  } else {
    throw new Error('unable to process proposal proponent');
  }

  return {
    ...restOfRaw,
    createdBy,
    updatedBy,
    proponent
  };
}

async function getCWUProposalSubmittedAt(connection: Connection, proposal: RawCWUProposal | RawCWUProposalSlim): Promise<Date | undefined> {
  return (await connection<{ submittedAt: Date }>('cwuProposalStatuses')
    .where({ proposal: proposal.id, status: CWUProposalStatus.Submitted })
    .orderBy('createdAt', 'desc')
    .select('createdAt as submittedAt')
    .first())?.submittedAt;
}

async function createCWUProposalAttachments(connection: Connection, trx: Transaction, proposalId: Id, attachments: FileRecord[]) {
  for (const attachment of attachments) {
    // Check to see for existing attachment relation.
    const existing = await connection('cwuProposalAttachments')
      .where({
        proposal: proposalId,
        file: attachment.id
      })
      .select('*')
      .first();
    // If it doesn't exist, create relation.
    if (!existing) {
      const [attachmentResult] = await connection('cwuProposalAttachments')
        .transacting(trx)
        .insert({
          proposal: proposalId,
          file: attachment.id
        }, '*');
      if (!attachmentResult) {
        throw new Error('Unable to create proposal attachment');
      }
    }
  }
}

async function rawCWUProposalHistoryRecordToCWUProposalHistoryRecord(connection: Connection, session: Session, raw: RawCWUProposalHistoryRecord): Promise<CWUProposalHistoryRecord> {
  const { createdBy: createdById, status, event, ...restOfRaw } = raw;
  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), null) : null;

  if (!status && !event) {
    throw new Error('unable to process proposal status record');
  }

  return {
    ...restOfRaw,
    createdBy,
    type: status ? adt('status', status as CWUProposalStatus) : adt('event', event as CWUProposalEvent)
  };
}

export async function hasAttachmentPermission(connection: Connection, session: Session, id: string): Promise<boolean> {
  // If file is an attachment on a publicly viewable opportunity, allow
  const results = await connection('cwuOpportunityAttachments as attachments')
    .innerJoin('cwuOpportunityVersions as versions', 'versions.id', '=', 'attachments.opportunityVersion')
    .innerJoin('cwuOpportunityStatuses as statuses', 'statuses.opportunity', '=' , 'versions.opportunity')
    .whereIn('statuses.status', publicOpportunityStatuses as CWUOpportunityStatus[])
    .andWhere({ 'attachments.file': id })
    .select('attachments.*');

  if (results.length > 0) {
    return true;
  }

  // If file is an attachment on a proposal, and requesting user has access to the proposal, allow
  if (session.user) {
    const rawProposals = await connection('cwuProposalAttachments as attachments')
      .innerJoin('cwuProposals as proposals', 'proposals.id', '=', 'attachments.proposal')
      .where({ 'attachments.file': id })
      .select<RawCWUProposal[]>('proposals.*');

    for (const rawProposal of rawProposals) {
      const proposal = await rawCWUProposalToCWUProposal(connection, session, rawProposal);
      if (await hasReadPermissionCWUProposal(connection, session, proposal)) {
        return true;
      }
    }
  }
  return false;
}

export const readOneCWUProposal = tryDb<[Id, Session], CWUProposal | null>(async (connection, id, session) => {
  const result = await connection<RawCWUProposal>('cwuProposals as prop')
    .where({ 'prop.id': id })
    .select<RawCWUProposal>(
      'prop.id',
      'prop.createdBy',
      'prop.createdAt',
      'prop.opportunity',
      'updatedBy',
      'updatedAt',
      'proposalText',
      'additionalComments',
      'proponentIndividual',
      'proponentOrganization'
    )
    .first();

  if (result) {
    // Fetch latest status for this proposal
    const statusResult = await connection<{ status: CWUProposalStatus }>('cwuProposalStatuses')
      .where({ proposal: result.id })
      .whereNotNull('status')
      .orderBy('createdAt', 'desc')
      .first();

    if (!statusResult) {
      throw new Error('unable to read proposal status');
    }
    result.status = statusResult.status;

    result.attachments = (await connection<{ file: Id }>('cwuProposalAttachments')
      .where({ proposal: result.id })
      .select('file')).map(row => row.file);

    // Include proposal history for admins/opportunity owners
    if (await readCWUProposalHistory(connection, session, result.opportunity)) {
      const rawProposalStasuses = await connection<RawCWUProposalHistoryRecord>('cwuProposalStatuses')
        .where({ proposal: result.id })
        .orderBy('createdAt', 'desc');

      result.history = await Promise.all(rawProposalStasuses.map(async raw => await rawCWUProposalHistoryRecordToCWUProposalHistoryRecord(connection, session, raw)));
    }

    // Fetch submittedAt date if it exists (get most recent submitted status)
    result.submittedAt = await getCWUProposalSubmittedAt(connection, result);

    // Check for permissions on viewing score and rank
    if (await readCWUProposalScore(connection, session, result.opportunity, result.id, result.status)) {
      // Add score to proposal
      result.score = (await connection<{ score: number }>('cwuProposals')
        .where({ id })
        .select('score')
        .first())?.score;

      // Add rank to proposal (if rankable)
      if (isRankableCWUProposalStatus(result.status)) {
        const ranks = await connection
          .from('cwuProposals as proposals')
          .join('cwuProposalStatuses as statuses', 'proposals.id', '=', 'statuses.proposal')
          .whereIn('statuses.status', [CWUProposalStatus.Evaluated, CWUProposalStatus.Awarded, CWUProposalStatus.NotAwarded])
          .andWhere({ opportunity: result.opportunity })
          .select<Array<{ id: Id, rank: number }>>(connection.raw('proposals.id, RANK () OVER (ORDER BY score DESC) rank'));
        result.rank = ranks.find(r => r.id === result.id)?.rank;
      }
    }
  }

  return valid(result ? await rawCWUProposalToCWUProposal(connection, session, result) : null);
});

export const readOneCWUProponent = tryDb<[Id], CWUIndividualProponent>(async (connection, id) => {
  const result = await connection<CWUIndividualProponent>('cwuProponents')
    .where({ id })
    .first();

  if (!result) {
    throw new Error('unable to read proponent');
  }

  return valid(result);
});

export const readManyCWUProposals = tryDb<[AuthenticatedSession, Id], CWUProposalSlim[]>(async (connection, session, id) => {
  const query = connection<RawCWUProposalSlim>('cwuProposals as prop')
    .where({ opportunity: id })
    .select<RawCWUProposalSlim[]>(
      'prop.id',
      'prop.createdBy',
      'prop.createdAt',
      'updatedBy',
      'updatedAt',
      'proponentIndividual',
      'proponentOrganization'
    );

  // If user is vendor, scope results to those proposals they have authored
  // If user is admin/gov, we don't scope, and include scores
  if (session.user.type === UserType.Vendor) {
    query.andWhere({ createdBy: session.user.id });
  } else {
    query.select('score');
  }

  let results = await query;

  if (!results) {
    throw new Error('unable to read proposals');
  }

  // Read latest status for each proposal, and get submittedDate if it exists
  for (const proposal of results) {
    const statusResult = await connection<{ status: CWUProposalStatus }>('cwuProposalStatuses')
      .where({ proposal: proposal.id })
      .whereNotNull('status')
      .orderBy('createdAt', 'desc')
      .first();

    if (!statusResult) {
      throw new Error('unable to read proposal status');
    }
    proposal.status = statusResult.status;

    proposal.submittedAt = await getCWUProposalSubmittedAt(connection, proposal);
  }

  // Filter out any proposals not in UNDER_REVIEW or later status if admin/gov owner
  if (session.user && session.user.type !== UserType.Vendor) {
    results = results.filter(result => isCWUProposalStatusVisibleToGovernment(result.status));
  }

  // Read ranks for rankable proposals and apply to existing result set
  const rankableProposals = results.filter(result => isRankableCWUProposalStatus(result.status));
  const ranks = await connection
    .from('cwuProposals')
    .whereIn('id', rankableProposals.map(r => r.id))
    .andWhere({ opportunity: id })
    .select(connection.raw('id, RANK () OVER (ORDER BY score DESC) rank'));

  for (const result of results) {
    const match = ranks.find(r => r.id === result.id);
    result.rank = match ? match.rank : undefined;
  }

  return valid(await Promise.all(results.map(async result => await rawCWUProposalSlimToCWUProposalSlim(connection, result))));
});

export const readOneProposalByOpportunityAndAuthor = tryDb<[Id, Session], CWUProposal | null>(async (connection, oppId, session) => {
  if (!session.user) {
    return valid(null);
  }
  const result = await connection<RawCWUProposal>('cwuProposals')
    .where({ opportunity: oppId, createdBy: session.user.id })
    .first();

  return valid(result ? await rawCWUProposalToCWUProposal(connection, session, result) : null);
});

export async function isCWUProposalAuthor(connection: Connection, user: User, id: Id): Promise<boolean> {
  try {
    const result = await connection<RawCWUProposal>('cwuProposals')
      .select('*')
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch (exception) {
    return false;
  }
}

export const createCWUProposal = tryDb<[CreateCWUProposalParams, AuthenticatedSession], CWUProposal>(async (connection, proposal, session) => {
  const now = new Date();
  return valid(await connection.transaction(async trx => {
    // If proponent is individual, create that record first
    const { attachments, proponent, status, ...restOfProposal } = proposal;
    let createProposalParamsWithProponent: Pick<RawCWUProposal, 'opportunity' | 'proponentIndividual' | 'proponentOrganization'>;
    if (proponent.tag === 'individual') {
      const [proponentId] = await connection('cwuProponents')
        .transacting(trx)
        .insert({
          ...proponent.value,
          id: generateUuid(),
          createdAt: now,
          createdBy: session.user.id,
          updatedAt: now,
          updatedBy: session.user.id
        }, 'id');
      createProposalParamsWithProponent = {
        ...restOfProposal,
        proponentIndividual: proponentId
      };
    } else {
      createProposalParamsWithProponent = {
        ...restOfProposal,
        proponentOrganization: proponent.value
      };
    }

    // Create root record for proposal
    const [rootRecord] = await connection<RawCWUProposal>('cwuProposals')
      .transacting(trx)
      .insert({
        ...createProposalParamsWithProponent,
        id: generateUuid(),
        createdAt: now,
        createdBy: session.user.id,
        updatedAt: now,
        updatedBy: session.user.id
      }, '*');

    if (!rootRecord) {
      throw new Error('unable to create proposal');
    }

    // Create a proposal status record
    await connection('cwuProposalStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        proposal: rootRecord.id,
        status,
        createdAt: now,
        createdBy: session.user.id,
        note: ''
      }, '*');

    // Create attachment records
    await createCWUProposalAttachments(connection, trx, rootRecord.id, attachments);

    const dbResult = await readOneCWUProposal(trx, rootRecord.id, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to create proposal');
    }
    return dbResult.value;
  }));
});

export const updateCWUProposal = tryDb<[UpdateCWUProposalParams, AuthenticatedSession], CWUProposal>(async (connection, proposal, session) => {
  const now = new Date();
  const { attachments, proponent, ...restOfProposal } = proposal;
  let proponentIndividualId: Id | null = null;
  return valid(await connection.transaction(async trx => {
    const proposalResult = await connection('cwuProposals')
      .where({ id: proposal.id })
      .select<RawCWUProposal>('proponentIndividual')
      .first();
    if (!proposalResult) { throw new Error('unable to update proposal'); }
    // Update/create individual proponent first to satisfy constraints.
    if (proponent.tag === 'individual') {
      if (proposalResult.proponentIndividual) {
        // Update existing proponent individual.
        await connection('cwuProponents')
          .transacting(trx)
          .where({
            id: proposalResult.proponentIndividual
          })
          .update({
            ...proponent.value,
            updatedAt: now,
            updatedBy: session.user.id
          });
        proponentIndividualId = proposalResult.proponentIndividual;
      } else {
        // No existing individual proponent, so create one instead.
        const [result] = await connection('cwuProponents')
          .transacting(trx)
          .insert({
            ...proponent.value,
            id: generateUuid(),
            createdAt: now,
            createdBy: session.user.id,
            updatedAt: now,
            updatedBy: session.user.id
          }, '*');
        proponentIndividualId = result.id;
      }
    }
    // Update proposal
    const [result] = await connection<RawCWUProposal>('cwuProposals')
      .transacting(trx)
      .where({ id: proposal.id })
      .update({
        ...restOfProposal,
        updatedAt: now,
        updatedBy: session.user.id,
        // Update proponent
        proponentIndividual: proponentIndividualId,
        proponentOrganization: proponent.tag === 'organization' ? proponent.value : null
      }, '*');

    if (!result) {
      throw new Error('unable to update proposal');
    }

    await createCWUProposalAttachments(connection, trx, result.id, attachments || []);

    const dbResult = await readOneCWUProposal(trx, result.id, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to update proposal');
    }
    return dbResult.value;
  }));
});

export const updateCWUProposalStatus = tryDb<[Id, CWUProposalStatus, string, AuthenticatedSession], CWUProposal>(async (connection, proposalId, status, note, session) => {
  const now = new Date();
  return valid(await connection.transaction(async trx => {
    const [result] = await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        proposal: proposalId,
        createdAt: now,
        createdBy: session.user.id,
        status,
        note
      }, '*');

    // Update updatedAt/By stamp on proposal root record
    await connection('cwuProposals')
      .transacting(trx)
      .where({ id: proposalId })
      .update({
        updatedAt: now,
        updatedBy: session.user.id
      });

    if (!result) {
      throw new Error('unable to update proposal');
    }

    const dbResult = await readOneCWUProposal(trx, result.proposal, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to update proposal');
    }

    return dbResult.value;
  }));
});

export const updateCWUProposalScore = tryDb<[Id, number, AuthenticatedSession], CWUProposal>(async (connection, proposalId, score, session) => {
  const now = new Date();
  return valid(await connection.transaction(async trx => {

    // Get latest status for this proposal
    const statusResult = await connection<RawCWUProposalHistoryRecord>('cwuProposalStatuses')
      .whereNotNull('status')
      .andWhere({ proposal: proposalId })
      .orderBy('createdAt', 'desc')
      .select('status')
      .first();

    if (statusResult?.status === CWUProposalStatus.UnderReview) {
      // Add new EVALUATED status for proposal
      await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
        .transacting(trx)
        .insert({
          id: generateUuid(),
          proposal: proposalId,
          createdAt: now,
          createdBy: session.user.id,
          status: CWUProposalStatus.Evaluated,
          note: ''
        }, '*');
    }

    // Update updatedAt/By stamp and score on proposal root record
    await connection('cwuProposals')
      .transacting(trx)
      .where({ id: proposalId })
      .update({
        score,
        updatedAt: now,
        updatedBy: session.user.id
      });

    // Create a history record for the score entry
    const [result] = await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        proposal: proposalId,
        createdAt: now,
        createdBy: session.user.id,
        event: CWUProposalEvent.ScoreEntered,
        note: `A score of "${score}%" was entered.`
      }, '*');

    if (!result) {
      throw new Error('unable to update proposal');
    }

    const dbResult = await readOneCWUProposal(trx, result.proposal, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to update proposal');
    }

    return dbResult.value;
  }));
});

export const awardCWUProposal = tryDb<[Id, string, AuthenticatedSession], CWUProposal>(async (connection, proposalId, note, session) => {
  const now = new Date();
  return valid(await connection.transaction(async trx => {
    // Update status for awarded proposal first
    await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        proposal: proposalId,
        createdAt: now,
        createdBy: session.user.id,
        status: CWUProposalStatus.Awarded,
        note
      }, '*');

    // Update proposal root record
    const [proposalRecord] = await connection<RawCWUProposal>('cwuProposals')
      .where({ id: proposalId })
      .update({
        updatedAt: now,
        updatedBy: session.user.id
      }, '*');

    // Update all other proposals on opportunity to Not Awarded where their status is Evaluated/Awarded
    const otherProposalIds = (await connection<{ id: Id }>('cwuProposals')
      .transacting(trx)
      .andWhere({ opportunity: proposalRecord.opportunity })
      .andWhereNot({ id: proposalId })
      .select('id'))?.map(result => result.id) || [];

    for (const id of otherProposalIds) {
      // Get latest status for proposal and check equal to Evaluated/Awarded
      const currentStatus = (await connection<{ status: CWUProposalStatus }>('cwuProposalStatuses')
        .whereNotNull('status')
        .andWhere({ proposal: id })
        .select('status')
        .orderBy('createdAt', 'desc')
        .first())?.status;

      if (currentStatus && [CWUProposalStatus.UnderReview, CWUProposalStatus.Evaluated, CWUProposalStatus.Awarded].includes(currentStatus)) {
        await connection<RawCWUProposalHistoryRecord & { proposal: Id }>('cwuProposalStatuses')
          .transacting(trx)
          .insert({
            id: generateUuid(),
            proposal: id,
            createdAt: now,
            createdBy: session.user.id,
            status: CWUProposalStatus.NotAwarded,
            note: ''
          });
      }
    }

    // Update opportunity
    await updateCWUOpportunityStatus(trx, proposalRecord.opportunity, CWUOpportunityStatus.Awarded, '', session);

    const dbResult = await readOneCWUProposal(trx, proposalRecord.id, session);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to update proposal');
    }

    return dbResult.value;
  }));
});

export const deleteCWUProposal = tryDb<[Id, Session], CWUProposal>(async (connection, id, session) => {
  // Delete root record
  const [result] = await connection<RawCWUProposal>('cwuProposals')
    .where({ id })
    .delete('*');

  if (!result) {
    throw new Error('unable to delete opportunity');
  }
  result.attachments = [];
  return valid(await rawCWUProposalToCWUProposal(connection, session, result));
});

export const readSubmittedCWUProposalCount = tryDb<[Id], number>(async (connection, opportunity) => {
  return valid((await connection<RawCWUProposal>('cwuProposals as proposals')
    .join('cwuProposalStatuses as statuses', function() {
      this
        .on('proposals.id', '=', 'statuses.proposal')
        .andOnNotNull('statuses.status')
        .andOn('statuses.createdAt', '=',
        connection.raw('(select max("createdAt") from "cwuProposalStatuses" as statuses2 where \
            statuses2.proposal = proposals.id and statuses2.status is not null)'));
    })
    .where({
      'proposals.opportunity': opportunity
    })
    .whereNotIn('statuses.status', [CWUProposalStatus.Draft, CWUProposalStatus.Withdrawn]))?.length || 0);
});

export const readOneCWUAwardedProposal = tryDb<[Id, Session], CWUProposalSlim | null>(async (connection, opportunity, session) => {
  const result = await connection<RawCWUProposalSlim>('cwuProposals as proposals')
    .join('cwuProposalStatuses as statuses', function() {
      this
        .on('proposals.id', '=', 'statuses.proposal')
        .andOnNotNull('statuses.status')
        .andOn('statuses.createdAt', '=',
        connection.raw('(select max("createdAt") from "cwuProposalStatuses" as statuses2 where \
            statuses2.proposal = proposals.id and statuses2.status is not null)'));
    })
    .where({
      'proposals.opportunity': opportunity,
      'statuses.status': CWUProposalStatus.Awarded
    })
    .select<RawCWUProposalSlim[]>(
      'proposals.id',
      'proposals.createdBy',
      'proposals.createdAt',
      'updatedBy',
      'updatedAt',
      'proponentIndividual',
      'proponentOrganization'
    )
    .first();

  return result ? valid(await rawCWUProposalSlimToCWUProposalSlim(connection, result)) : valid(null);
});

