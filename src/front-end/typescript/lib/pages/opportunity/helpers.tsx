import React from 'react';
import {CWUOpportunityStatus, CWUOpportunityEvent} from 'shared/lib/resources/opportunity/code-with-us';
import {SWUOpportunityEvent, SWUOpportunityStatus} from 'shared/lib/resources/opportunity/sprint-with-us'
import { toast} from 'front-end/lib/framework';
import * as Attachments from 'front-end/lib/components/attachments'
import * as api from 'front-end/lib/http/api';
import { invalid } from 'shared/lib/validation';
import { adt } from 'shared/lib/types';
import { Alert } from 'reactstrap';

const toasts = {
  success: {
    title: 'Note Published',
    body: 'Your note has been successfully published.'
  },
  error: {
    title: 'Unable to Publish Note',
    body: 'Your note could not be published. Please try again later.'
  }
};

export function historyToHistoryTableRow(rawHistory){

    const convertHistoryItemToHistoryTableItem = status =>{
      switch (status) {
        case CWUOpportunityEvent.Edited || SWUOpportunityEvent.Edited:
          return {
            text: 'Note Added',
            color: undefined
          }
        case CWUOpportunityEvent.AddendumAdded || SWUOpportunityEvent.AddendumAdded:
          return {
            text: 'Addendum Added',
            color: undefined
          }
        case CWUOpportunityEvent.NoteAdded || SWUOpportunityEvent.NoteAdded:
        return {
          text: 'Note Added',
          color: undefined
        }
        case CWUOpportunityStatus.Draft || SWUOpportunityStatus.Draft:
          return {
            text: 'Draft',
            color: 'secondary'
          }
        case CWUOpportunityStatus.Published || SWUOpportunityStatus.Published:
          return {
            text: 'Published',
            color: 'success'
          }
        case CWUOpportunityStatus.Evaluation:
          return {
            text: 'Evaluation',
            color: 'warning'
          }
        case CWUOpportunityStatus.Awarded || SWUOpportunityStatus.Awarded:
          return {
            text: 'Awarded',
            color: 'success'
          }
        case CWUOpportunityStatus.Suspended || SWUOpportunityStatus.Suspended:
          return {
            text: 'Suspended',
            color: 'secondary'
          }
        case CWUOpportunityStatus.Canceled || SWUOpportunityStatus.Canceled:
          return {
            text: 'Cancelled',
            color: 'danger'
          }

        case SWUOpportunityStatus.UnderReview:
            return {
                text: 'Under Review',
                color: 'warning'
            }
        case SWUOpportunityStatus.EvaluationTeamQuestions:
            return {
                text: 'Team Questions',
                color: 'warning'
            }
        case SWUOpportunityStatus.EvaluationCodeChallenge:
            return {
                text: 'Code Challenge',
                color: 'warning'
            }
        case SWUOpportunityStatus.EvaluationTeamScenario:
            return {
                text: 'Team Scenario',
                color: 'warning'
            }
        default:
          return {
            text: null,
            color: undefined
          }
      }
    }

    return rawHistory
      .map(s => ({
        type: convertHistoryItemToHistoryTableItem(s.type.value),
        note: s.note,
        attachments: s.attachments,
        createdAt: s.createdAt,
        createdBy: s.createdBy || undefined
      }));
}

const sendNoteAttachmentsToDB = async function(state) {
  const newAttachments = Attachments.getNewAttachments(state.attachments);

  if (newAttachments && newAttachments.length > 0) {
    const result = await api.uploadNoteFiles(newAttachments);
      // if valid, this adds the files to the files and fileBlobs tables
    switch (result.tag) {
      case 'valid':
        return result;
        break;
      case 'invalid':
          return invalid(state.update('attachments', attachments => Attachments.setNewAttachmentErrors(attachments, result.value)));
      case 'unhandled':
          return invalid(state);
      }
    }
    return invalid(state);
}

export const createHistoryNote = async function (state, dispatch) {
    let attachmentIds;
    if (
      state.attachments.newAttachments &&
      state.attachments.newAttachments.length >= 1
    ) {
      //send attachments to db
      const attachmentsBackFromDB = await sendNoteAttachmentsToDB(state);
      switch (attachmentsBackFromDB.tag) {
        case "valid":
          attachmentIds = attachmentsBackFromDB.value.map(({ id }) => id);
          break;
        default:
          dispatch(toast(adt("error", toasts.error)));
          // leave note text and attachments in state so that user can quickly resubmit if there was a db error
          return state;
      }
    }
    //send new note to db
    const notesBackFromDB = await state.publishNewNote({
      note: state.modalNote.child.value,
      attachments: attachmentIds,
    });
    switch (notesBackFromDB.tag) {
      case "valid":
        dispatch(toast(adt("success", toasts.success)));
        //clear note modal
        state = state
          .setIn(["history", "items"], notesBackFromDB.value)
          .setIn(["modalNote", "child", "value"], "")
          .setIn(["attachments", "newAttachments"], []);

        return state;
      default:
        dispatch(toast(adt("error", toasts.error)));
        // leave note text and attachments in state so that user can quickly resubmit if there was a db error
        return state;
    }
};

const isNoteMinLengthValid = (state) => {
  return state.modalNote.child.value.trim().length !== 0
};

const isNoteMaxLengthValid = (state, MAX_NOTE_LENGTH) => {
return state.modalNote.child.value.length < MAX_NOTE_LENGTH
}

export const isNoteValid = (state, MAX_NOTE_LENGTH) => {
  return isNoteMinLengthValid(state) && isNoteMaxLengthValid(state, MAX_NOTE_LENGTH) ? true: false;
}

export const createNoteError = (state, MAX_NOTE_LENGTH) => {
  if (!isNoteMinLengthValid(state)) {
    return <Alert color="danger">Note cannot be blank</Alert>;
  }
  if (!isNoteMaxLengthValid(state, MAX_NOTE_LENGTH)) {
    return (
      <Alert color="danger">
        Note cannot be longer than {MAX_NOTE_LENGTH} characters
      </Alert>
    );
  }
  return null;
};

const isAttachmentFormatValid = (state, SUPPORTED_NOTE_ATTACHMENT_FORMATS) => {
  if (state.attachments.newAttachments.length >= 1) {
    return state.attachments.newAttachments.filter(
        (attachment) => !SUPPORTED_NOTE_ATTACHMENT_FORMATS.includes(attachment.file.type)
      ).length === 0;
  }
  return true;
};

const isAttachmentSizeValid = (state, MAX_NOTE_ATTACHMENT_SIZE) => {
  if (state.attachments.newAttachments.length >= 1) {
    return state.attachments.newAttachments.filter(
        (attachment) => attachment.file.size > MAX_NOTE_ATTACHMENT_SIZE
      ).length === 0;
  }
  return true;
};

export const isAttachmentValid = (state, MAX_NOTE_ATTACHMENT_SIZE, SUPPORTED_NOTE_ATTACHMENT_FORMATS) => {
  return isAttachmentFormatValid(state, SUPPORTED_NOTE_ATTACHMENT_FORMATS) && isAttachmentSizeValid(state, MAX_NOTE_ATTACHMENT_SIZE) ? true : false;
};

export const createAttachmentError = (state, MAX_NOTE_ATTACHMENT_SIZE, SUPPORTED_NOTE_ATTACHMENT_FORMATS) => {

  if (!isAttachmentFormatValid(state, SUPPORTED_NOTE_ATTACHMENT_FORMATS) && !isAttachmentSizeValid(state, MAX_NOTE_ATTACHMENT_SIZE)) {
    return (
      <>
        <Alert color="danger">Attachments must be PDFs</Alert>
        <Alert color="danger">
          Attachments must be smaller than {MAX_NOTE_ATTACHMENT_SIZE / 1000000} MB
        </Alert>
      </>
    );
  }

  if (!isAttachmentFormatValid(state, SUPPORTED_NOTE_ATTACHMENT_FORMATS)) {
    return <Alert color="danger">Attachments must be PDFs</Alert>;
  }
  if (!isAttachmentSizeValid(state, MAX_NOTE_ATTACHMENT_SIZE)) {
    return (
      <Alert color="danger">
        Attachments must be smaller than {MAX_NOTE_ATTACHMENT_SIZE / 1000000} MB
      </Alert>
    );
  }
  return null;
};
