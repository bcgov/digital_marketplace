import { generateUuid } from 'back-end/lib';
import { Connection, Transaction, tryDb } from 'back-end/lib/db';
import { readOneFileById } from 'back-end/lib/db/file';
import { RawSWUOpportunitySubscriber } from 'back-end/lib/db/subscribers/sprint-with-us';
import { readOneUserSlim } from 'back-end/lib/db/user';
import { valid } from 'shared/lib/http';
import { Addendum } from 'shared/lib/resources/addendum';
import { FileRecord } from 'shared/lib/resources/file';
import { CreateSWUOpportunityPhaseBody, CreateSWUOpportunityStatus, CreateSWUTeamQuestionBody, privateOpportunityStatuses, publicOpportunityStatuses, SWUOpportunity, SWUOpportunityEvent, SWUOpportunityHistoryRecord, SWUOpportunityPhase, SWUOpportunityPhaseRequiredCapability, SWUOpportunityPhaseType, SWUOpportunitySlim, SWUOpportunityStatus, SWUTeamQuestion } from 'shared/lib/resources/opportunity/sprint-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { User, UserType } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';
import { getValidValue, isInvalid } from 'shared/lib/validation';

interface CreateSWUOpportunityParams extends Omit<SWUOpportunity, 'createdBy' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'status' | 'id' | 'addenda' | 'inceptionPhase' | 'prototypePhase' | 'implementationPhase' | 'teamQuestions'> {
  status: CreateSWUOpportunityStatus;
  inceptionPhase?: CreateSWUOpportunityPhaseParams;
  prototypePhase?: CreateSWUOpportunityPhaseParams;
  implementationPhase: CreateSWUOpportunityPhaseParams;
  teamQuestions: CreateSWUTeamQuestionBody[];
}

interface UpdateSWUOpportunityParams extends Omit<CreateSWUOpportunityParams, 'status'> {
  id: Id;
}

interface CreateSWUOpportunityPhaseParams extends Omit<CreateSWUOpportunityPhaseBody, 'startDate' | 'completionDate'> {
  startDate: Date;
  completionDate: Date;
}

interface SWUOpportunityRootRecord {
  id: Id;
  createdAt: Date;
  createdBy: Id;
}

interface SWUOpportunityVersionRecord extends Omit<SWUOpportunity, 'status' | 'createdBy'> {
  createdBy: Id;
  opportunity: Id;
}

interface SWUOpportunityStatusRecord {
  id: Id;
  opportunity: Id;
  createdAt: Date;
  createdBy: Id;
  status: SWUOpportunityStatus;
  note: string;
}

interface RawSWUOpportunity extends Omit<SWUOpportunity, 'createdBy' | 'updatedBy' | 'attachments' | 'addenda' | 'teamQuestions' | 'inceptionPhase' | 'prototypePhase' | 'implementationPhase'> {
  createdBy?: Id;
  updatedBy?: Id;
  attachments: Id[];
  addenda: Id[];
  teamQuestions: Id[];
  inceptionPhase?: Id;
  prototypePhase?: Id;
  implementationPhase: Id;
  versionId: Id;
}

interface RawSWUOpportunitySlim extends Omit<SWUOpportunitySlim, 'createdBy' | 'updatedBy'> {
  createdBy?: Id;
  updatedBy?: Id;
}

interface RawSWUOpportunityAddendum extends Omit<Addendum, 'createdBy'> {
  createdBy?: Id;
}

interface RawSWUOpportunityPhase extends Omit<SWUOpportunityPhase, 'createdBy' | 'updatedBy' | 'requiredCapabilities'> {
  id: Id;
  createdBy?: Id;
  updatedBy?: Id;
  requiredCapabilities: Id[];
}

interface RawPhaseRequiredCapability extends Omit<SWUOpportunityPhaseRequiredCapability, 'createdBy' | 'updatedBy'> {
  createdBy?: Id;
  updatedBy?: Id;
}

interface RawTeamQuestion extends Omit<SWUTeamQuestion, 'createdBy' | 'updatedBy'> {
  createdBy?: Id;
  updatedBy?: Id;
}

interface RawSWUOpportunityHistoryRecord extends Omit<SWUOpportunityHistoryRecord, 'createdBy' | 'type'> {
  createdBy: Id | null;
  status?: SWUOpportunityStatus;
  event?: SWUOpportunityEvent;
}

async function rawSWUOpportunityToSWUOpportunity(connection: Connection, raw: RawSWUOpportunity): Promise<SWUOpportunity> {
  const {
    createdBy: createdById,
    updatedBy: updatedById,
    attachments: attachmentIds,
    addenda: addendaIds,
    inceptionPhase: inceptionPhaseId,
    prototypePhase: prototypePhaseId,
    implementationPhase: implementationPhaseId,
    teamQuestions: teamQuestionIds,
    ...restOfRaw
  } = raw;

  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), undefined) : undefined;
  const updatedBy = updatedById ? getValidValue(await readOneUserSlim(connection, updatedById), undefined) : undefined;
  const attachments = await Promise.all(attachmentIds.map(async id => {
    const result = getValidValue(await readOneFileById(connection, id), null);
    if (!result) {
      throw new Error('unable to process opportunity');
    }
    return result;
  }));
  const addenda = getValidValue(await readManyAddendum(connection, raw.id), undefined);
  const teamQuestions = getValidValue(await readManyTeamQuestions(connection, raw.id), undefined);
  const inceptionPhase = inceptionPhaseId ? getValidValue(await readOneSWUOpportunityPhase(connection, inceptionPhaseId), undefined) : undefined;
  const prototypePhase = prototypePhaseId ? getValidValue(await readOneSWUOpportunityPhase(connection, prototypePhaseId), undefined) : undefined;
  const implementationPhase = getValidValue(await readOneSWUOpportunityPhase(connection, implementationPhaseId), undefined);

  if (!addenda || !teamQuestions || !implementationPhase) {
    throw new Error('unable to process opportunity');
  }

  delete raw.versionId;

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    attachments,
    addenda,
    teamQuestions,
    inceptionPhase,
    prototypePhase,
    implementationPhase
  };
}

async function rawSWUOpportunitySlimToSWUOpportunitySlim(connection: Connection, raw: RawSWUOpportunitySlim): Promise<SWUOpportunitySlim> {
  const { createdBy: createdById, updatedBy: updatedById, ...restOfRaw } = raw;
  const createdBy = createdById && getValidValue(await readOneUserSlim(connection, createdById), undefined) || undefined;
  const updatedBy = updatedById && getValidValue(await readOneUserSlim(connection, updatedById), undefined) || undefined;
  return {
    ...restOfRaw,
    createdBy,
    updatedBy
  };
}

async function rawSWUOpportunityAddendumToSWUOpportunityAddendum(connection: Connection, raw: RawSWUOpportunityAddendum): Promise<Addendum> {
  const { createdBy: createdById, ...restOfRaw } = raw;
  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), undefined) : undefined;

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined
  };
}

async function rawSWUOpportunityPhaseToSWUOpportunityPhase(connection: Connection, raw: RawSWUOpportunityPhase): Promise<SWUOpportunityPhase> {
  const { createdBy: createdById, ...restOfRaw } = raw;

  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), undefined) : undefined;
  const requiredCapabilities = getValidValue(await readManyRequiredCapabilities(connection, raw.id), undefined);

  if (!createdBy || !requiredCapabilities) {
    throw new Error('unable to process opportunity phase');
  }

  delete raw.id;

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    requiredCapabilities
  };
}

async function rawRequiredCapabilityToRequiredCapability(connection: Connection, raw: RawPhaseRequiredCapability): Promise<SWUOpportunityPhaseRequiredCapability> {
  const { createdBy: createdById, ...restOfRaw } = raw;

  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), undefined) : undefined;

  if (!createdBy) {
    throw new Error('unable to process phase required capability');
  }

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined
  };
}

async function rawTeamQuestionToTeamQuestion(connection: Connection, raw: RawTeamQuestion): Promise<SWUTeamQuestion> {
  const { createdBy: createdById, ...restOfRaw } = raw;

  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), undefined) : undefined;

  if (!createdBy) {
    throw new Error('unable to process team question');
  }

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined
  };
}

async function rawHistoryRecordToHistoryRecord(connection: Connection, session: Session, raw: RawSWUOpportunityHistoryRecord): Promise<SWUOpportunityHistoryRecord> {
  const { createdBy: createdById, status, event, ...restOfRaw } = raw;
  const createdBy = createdById ? getValidValue(await readOneUserSlim(connection, createdById), null) : null;

  if (!status && !event) {
    throw new Error('unable to process opportunity status record');
  }

  return {
    ...restOfRaw,
    createdBy,
    type: status ? adt('status', status as SWUOpportunityStatus) : adt('event', event as SWUOpportunityEvent)
  };
}

export async function isSWUOpportunityAuthor(connection: Connection, user: User, id: Id): Promise<boolean> {
  try {
    const result = await connection<RawSWUOpportunity>('swuOpportunities')
      .select('*')
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch (exception) {
    return false;
  }
}

export const readManyAddendum = tryDb<[Id], Addendum[]>(async (connection, opportunityId) => {
  const results = await connection<RawSWUOpportunityAddendum>('swuOpportunityAddenda')
    .where({ opportunity: opportunityId });

  if (!results) {
    throw new Error('unable to read addenda');
  }

  return valid(await Promise.all(results.map(async raw => await rawSWUOpportunityAddendumToSWUOpportunityAddendum(connection, raw))));
});

export const readManyRequiredCapabilities = tryDb<[Id], SWUOpportunityPhaseRequiredCapability[]>(async (connection, phaseId) => {
  const results = await connection<RawPhaseRequiredCapability>('swuPhaseCapabilities')
    .where({ phase: phaseId });

  if (!results) {
    throw new Error('unable to read required capabilities');
  }

  return valid(await Promise.all(results.map(async raw => await rawRequiredCapabilityToRequiredCapability(connection, raw))));
});

export const readManyTeamQuestions = tryDb<[Id], SWUTeamQuestion[]>(async (connection, opportunityVersionId) => {
  const results = await connection<RawTeamQuestion>('swuTeamQuestions')
    .where({ opportunityVersion: opportunityVersionId })
    .orderBy('order', 'asc');

  if (!results) {
    throw new Error('unable to read team questions');
  }

  return valid(await Promise.all(results.map(async raw => await rawTeamQuestionToTeamQuestion(connection, raw))));
});

export const readManySWUOpportunities = tryDb<[Session], SWUOpportunitySlim[]>(async (connection, session) => {
  // Retrieve the opportunity and most recent opportunity status

  let query = connection<RawSWUOpportunitySlim>('swuOpportunities as opp')
    // Join on latest SWU status
    .join<RawSWUOpportunitySlim>('swuOpportunityStatuses as stat', function() {
      this
        .on('opp.id', '=', 'stat.opportunity')
        .andOn('stat.createdAt', '=',
          connection.raw('(select max("createdAt") from "swuOpportunityStatuses" as stat2 where \
            stat2.opportunity = opp.id and stat2.status is not null)'));
    })
    // Join on latest SWU version
    .join<RawSWUOpportunitySlim>('swuOpportunityVersions as version', function() {
      this
        .on('opp.id', '=', 'version.opportunity')
        .andOn('version.createdAt', '=',
          connection.raw('(select max("createdAt") from "swuOpportunityVersions" as version2 where \
            version2.opportunity = opp.id)'));
    })
    // Select fields for 'slim' opportunity
    .select(
      'opp.id',
      'version.title',
      'opp.createdBy',
      'opp.createdAt',
      'version.createdAt as updatedAt',
      'version.createdBy as updatedBy',
      'version.proposalDeadline',
      'stat.status'
    );

  if (!session.user || session.user.type === UserType.Vendor) {
    // Anonymous users and vendors can only see public opportunities
    query = query
      .whereIn('stat.status', publicOpportunityStatuses as SWUOpportunityStatus[]);
  } else if (session.user.type === UserType.Government) {
    // Gov basic users should only see private opportunities that they own, and public opportunities
    query = query
      .whereIn('stat.status', publicOpportunityStatuses as SWUOpportunityStatus[])
      .orWhere(function() {
        this
          .whereIn('stat.status', privateOpportunityStatuses as SWUOpportunityStatus[])
          .andWhere({ 'opp.createdBy': session.user?.id });
      });
  }
  // Admins can see all opportunities, so no additional filter necessary if none of the previous conditions match
  // Process results to eliminate fields not viewable by the current role
  const results = (await query).map(result => processForRole(result, session));
  return valid(await Promise.all(results.map(async raw => await rawSWUOpportunitySlimToSWUOpportunitySlim(connection, raw))));
});

export const readOneSWUOpportunityPhase = tryDb<[Id], SWUOpportunityPhase>(async (connection, id) => {
  const result = await connection<RawSWUOpportunityPhase>('swuOpportunityPhases')
    .where({ id })
    .first();

  if (!result) {
    throw new Error('unable to read opportunity phase');
  }

  return valid(await rawSWUOpportunityPhaseToSWUOpportunityPhase(connection, result));
});

async function createSWUOpportunityAttachments(connection: Connection, trx: Transaction, oppVersionId: Id, attachments: FileRecord[]) {
  for (const attachment of attachments) {
    const [attachmentResult] = await connection('swuOpportunityAttachments')
      .transacting(trx)
      .insert({
        opportunityVersion: oppVersionId,
        file: attachment.id
      }, '*');
    if (!attachmentResult) {
      throw new Error('Unable to create opportunity attachment');
    }
  }
}

function processForRole<T extends RawSWUOpportunity>(result: T, session: Session) {
  // Remove createdBy/updatedBy for non-admin or non-author
  if (!session.user || (session.user.type !== UserType.Admin &&
    session.user.id !== result.createdBy &&
    session.user.id !== result.updatedBy)) {
      delete result.createdBy;
      delete result.updatedBy;
  }
  return result;
}

export const readOneSWUOpportunity = tryDb<[Id, Session], SWUOpportunity | null>(async (connection, id, session) => {
  let query = connection<RawSWUOpportunity>('swuOpportunities as opp')
    .where({ 'opp.id': id })
    // Join on latest SWU status
    .join<RawSWUOpportunity>('swuOpportunityStatuses as stat', function() {
      this
        .on('opp.id', '=', 'stat.opportunity')
        .andOn('stat.createdAt', '=',
          connection.raw('(select max("createdAt") from "swuOpportunityStatuses" as stat2 where \
            stat2.opportunity = opp.id and stat2.status is not null)'));
    })
    // Join on latest SWU version
    .join<RawSWUOpportunity>('swuOpportunityVersions as version', function() {
      this
        .on('opp.id', '=', 'version.opportunity')
        .andOn('version.createdAt', '=',
          connection.raw('(select max("createdAt") from "swuOpportunityVersions" as version2 where \
            version2.opportunity = opp.id)'));
    })
    .select(
      'opp.id',
      'opp.createdAt',
      'opp.createdBy',
      'version.id as versionId',
      'version.createdAt as updatedAt',
      'version.createdBy as updatedBy',
      'version.title',
      'version.teaser',
      'version.remoteOk',
      'version.remoteDesc',
      'version.location',
      'version.totalMaxBudget',
      'version.minTeamMembers',
      'version.mandatorySkills',
      'version.optionalSkills',
      'version.description',
      'version.proposalDeadline',
      'version.assignmentDate',
      'version.questionsWeight',
      'version.codeChallengeWeight',
      'version.scenarioWeight',
      'version.priceWeight',
      'stat.status'
    );

  if (!session.user || session.user.type === UserType.Vendor) {
    // Anonymous users and vendors can only see public opportunities
    query = query
      .whereIn('stat.status', publicOpportunityStatuses as SWUOpportunityStatus[]);
  } else if (session.user.type === UserType.Government) {
    // Gov users should only see private opportunities they own, and public opportunities
    query = query
      .andWhere(function() {
        this
          .whereIn('stat.status', publicOpportunityStatuses as SWUOpportunityStatus[])
          .orWhere(function() {
            this
              .whereIn('stat.status', privateOpportunityStatuses as SWUOpportunityStatus[])
              .andWhere({ 'opp.createdBy': session.user?.id });
          });
      });
  } else {
    // Admin users can see both private and public opportunities
    query = query
      .whereIn('stat.status', [...publicOpportunityStatuses, ...privateOpportunityStatuses]);
  }

  let result = await query.first<RawSWUOpportunity>();

  if (result) {
    // Process based on user type
    result = processForRole(result, session);

    // Query for attachment file ids
    result.attachments = (await connection<{ file: Id }>('swuOpportunityAttachments')
      .where({ opportunityVersion: result.versionId })
      .select('file')).map(row => row.file);

    // Get published date if applicable
    result.publishedAt = (await connection<{ createdAt: Date }>('swuOpportunityStatuses')
      .where({ opportunity: result.id, status: SWUOpportunityStatus.Published })
      .select('createdAt')
      .orderBy('createdAt', 'desc')
      .first())?.createdAt;

    // If authenticated, add on subscription status flag
    if (session.user) {
      result.subscribed = !!(await connection<RawSWUOpportunitySubscriber>('swuOpportunitySubscribers')
        .where({ opportunity: result.id, user: session.user.id })
        .first());
    }

    // If admin/owner, add on history
    if (session.user?.type === UserType.Admin || result.createdBy === session.user?.id) {
      const rawHistory = await connection<RawSWUOpportunityHistoryRecord>('swuOpportunityStatuses')
        .where({ opportunity: result.id })
        .orderBy('createdAt', 'desc');

      result.history = await Promise.all(rawHistory.map(async raw => await rawHistoryRecordToHistoryRecord(connection, session, raw)));
    }

    // Retrieve phases for the opportunity version
    result.inceptionPhase = (await connection<{ id: Id }>('swuOpportunityPhases')
      .where({ opportunityVersion: result.versionId, phase: SWUOpportunityPhaseType.Inception })
      .select('id')
      .first())?.id;

    result.prototypePhase = (await connection<{ id: Id }>('swuOpportunityPhases')
      .where({ opportunityVersion: result.versionId, phase: SWUOpportunityPhaseType.Prototype })
      .select('id')
      .first())?.id;

    const implementationPhaseId = (await connection<{ id: Id }>('swuOpportunityPhases')
      .where({ opportunityVersion: result.versionId, phase: SWUOpportunityPhaseType.Implementation })
      .select('id')
      .first())?.id;

    if (!implementationPhaseId) {
      throw new Error('unable to retrieve phase for opportunity');
    }
    result.implementationPhase = implementationPhaseId;
  }

  return valid(result ? await rawSWUOpportunityToSWUOpportunity(connection, result) : null);
});

export const createSWUOpportunity = tryDb<[CreateSWUOpportunityParams, AuthenticatedSession], SWUOpportunity>(async (connection, opportunity, session) => {
  // Create the opportunity root record
  const now = new Date();
  const opportunityId = await connection.transaction(async trx => {
    const [opportunityRootRecord] = await connection<SWUOpportunityRootRecord>('swuOpportunities')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        createdAt: now,
        createdBy: session.user.id
      }, '*');

    if (!opportunityRootRecord) {
      throw new Error('unable to create opportunity root record');
    }

    // Create initial opportunity version
    const { attachments, status, inceptionPhase, prototypePhase, implementationPhase, teamQuestions, ...restOfOpportunity } = opportunity;
    const [opportunityVersionRecord] = await connection<SWUOpportunityVersionRecord>('swuOpportunityVersions')
      .transacting(trx)
      .insert({
        ...restOfOpportunity,
        id: generateUuid(),
        opportunity: opportunityRootRecord.id,
        createdAt: now,
        createdBy: session.user.id
      }, '*');

    if (!opportunityVersionRecord) {
      throw new Error('unable to create opportunity version');
    }

    // Create initial opportunity status
    const [opportunityStatusRecord] = await connection<SWUOpportunityStatusRecord>('swuOpportunityStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: opportunityRootRecord.id,
        createdAt: now,
        createdBy: session.user.id,
        status,
        note: ''
      }, '*');

    if (!opportunityStatusRecord) {
      throw new Error('unable to create opportunity status');
    }

    // Create attachments
    await createSWUOpportunityAttachments(connection, trx, opportunityVersionRecord.id, attachments);

    // Create phases
    if (opportunity.inceptionPhase) {
      await createSWUOpportunityPhase(trx, opportunityVersionRecord.id, opportunity.inceptionPhase, SWUOpportunityPhaseType.Inception, session);
    }
    if (opportunity.prototypePhase) {
      await createSWUOpportunityPhase(trx, opportunityVersionRecord.id, opportunity.prototypePhase, SWUOpportunityPhaseType.Prototype, session);
    }
    await createSWUOpportunityPhase(trx, opportunityVersionRecord.id, opportunity.implementationPhase, SWUOpportunityPhaseType.Implementation, session);

    // Create team questions
    for (const teamQuestion of teamQuestions) {
      await connection<RawTeamQuestion & { opportunityVersion: Id }>('swuTeamQuestions')
        .transacting(trx)
        .insert({
          ...teamQuestion,
          createdAt: now,
          createdBy: session.user.id,
          opportunityVersion: opportunityVersionRecord.id
        });
    }

    return opportunityRootRecord.id;
  });

  const dbResult = await readOneSWUOpportunity(connection, opportunityId, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to create opportunity');
  }
  return valid(dbResult.value);
});

export const createSWUOpportunityPhase = tryDb<[Id, CreateSWUOpportunityPhaseParams, SWUOpportunityPhaseType, AuthenticatedSession], SWUOpportunityPhase>(async (connection, opportunityVersionId, phase, type, session) => {
  const now = new Date();
  const { requiredCapabilities, ...restOfRaw } = phase;
  const phaseId = await connection.transaction(async trx => {
    const [phaseRecord] = await connection<RawSWUOpportunityPhase & { opportunityVersion: Id }>('swuOpportunityPhases')
      .transacting(trx)
      .insert({
        ...restOfRaw,
        id: generateUuid(),
        phase: type,
        opportunityVersion: opportunityVersionId,
        createdAt: now,
        createdBy: session.user.id
      }, '*');

    if (!phaseRecord) {
      throw new Error('unable to create opportunity phase');
    }

    for (const requiredCapability of requiredCapabilities) {
      await connection<RawPhaseRequiredCapability & { phase: Id }>('swuPhaseCapabilities')
        .transacting(trx)
        .insert({
          ...requiredCapability,
          phase: phaseRecord.id,
          createdAt: now,
          createdBy: session.user.id
        }, '*');
    }
    return phaseRecord.id;
  });

  return await readOneSWUOpportunityPhase(connection, phaseId);
});

export const updateSWUOpportunityVersion = tryDb<[UpdateSWUOpportunityParams, AuthenticatedSession], SWUOpportunity>(async (connection, opportunity, session) => {
  const now = new Date();
  const { attachments, inceptionPhase, prototypePhase, implementationPhase, teamQuestions, ...restOfOpportunity } = opportunity;
  const opportunityVersion = await connection.transaction(async trx => {
    const [versionRecord] = await connection<SWUOpportunityVersionRecord>('swuOpportunityVersions')
      .transacting(trx)
      .insert({
        ...restOfOpportunity,
        opportunity: restOfOpportunity.id,
        id: generateUuid(),
        createdAt: now,
        createdBy: session.user.id
      }, '*');

    if (!versionRecord) {
      throw new Error('unable to update opportunity');
    }

    // Create attachments
    await createSWUOpportunityAttachments(connection, trx, versionRecord.id, attachments || []);

    // Create phases
    if (inceptionPhase) {
      await createSWUOpportunityPhase(trx, versionRecord.id, inceptionPhase, SWUOpportunityPhaseType.Inception, session);
    }
    if (prototypePhase) {
      await createSWUOpportunityPhase(trx, versionRecord.id, prototypePhase, SWUOpportunityPhaseType.Prototype, session);
    }
    await createSWUOpportunityPhase(trx, versionRecord.id, implementationPhase, SWUOpportunityPhaseType.Implementation, session);

    // Create team questions
    for (const teamQuestion of teamQuestions) {
      await connection<RawTeamQuestion & { opportunityVersion: Id }>('swuTeamQuestions')
        .transacting(trx)
        .insert({
          ...teamQuestion,
          createdAt: now,
          createdBy: session.user.id,
          opportunityVersion: versionRecord.id
        });
    }

    // Add an 'edit' change record
    await connection<RawSWUOpportunityHistoryRecord & { opportunity: Id }>('swuOpportunityStatuses')
      .insert({
        id: generateUuid(),
        opportunity: restOfOpportunity.id,
        createdAt: now,
        createdBy: session.user.id,
        event: SWUOpportunityEvent.Edited,
        note: ''
      });

    return versionRecord;
  });
  const dbResult = await readOneSWUOpportunity(connection, opportunityVersion.opportunity, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to update opportunity');
  }
  return valid(dbResult.value);
});

export const updateSWUOpportunityStatus = tryDb<[Id, SWUOpportunityStatus, string, AuthenticatedSession], SWUOpportunity>(async (connection, id, status, note, session) => {
  const now = new Date();
  const [result] = await connection<RawSWUOpportunityHistoryRecord & { opportunity: Id }>('swuOpportunityStatuses')
    .insert({
      id: generateUuid(),
      opportunity: id,
      createdAt: now,
      createdBy: session.user.id,
      status,
      note
    }, '*');

  if (!result) {
    throw new Error('unable to update opportunity');
  }

  const dbResult = await readOneSWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to update opportunity');
  }

  return valid(dbResult.value);
});

export const addSWUOpportunityAddendum = tryDb<[Id, string, AuthenticatedSession], SWUOpportunity>(async (connection, id, addendumText, session) => {
  const now = new Date();
  await connection.transaction(async trx => {
    const [addendum] = await connection<RawSWUOpportunityAddendum & { opportunity: Id }>('swuOpportunityAddenda')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: id,
        description: addendumText,
        createdBy: session.user.id,
        createdAt: now
      }, '*');

    if (!addendum) {
      throw new Error('unable to add addendum');
    }

    // Add a history record for the addendum addition
    await connection<RawSWUOpportunityHistoryRecord & { opportunity: Id }>('swuOpportunityStatuses')
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: id,
        createdAt: now,
        createdBy: session.user.id,
        event: SWUOpportunityEvent.AddendumAdded,
        note: ''
      });
  });

  const dbResult = await readOneSWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to add addendum');
  }
  return valid(dbResult.value);
});
