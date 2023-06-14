import * as cmd from "front-end/lib/framework/component/cmd";
import assert from "assert";
import { ADT, adt } from "shared/lib/types";
import sinon from "sinon";

type Msg = ADT<"noop"> | ADT<"dispatch">;

function makeDebouncedDispatch(duration: number) {
  return cmd.makeDebouncedDispatch<Msg>(adt("noop"), adt("dispatch"), duration);
}

function executeCmd<A>(cmd: cmd.Cmd<A>): Promise<A> {
  return cmd.value();
}

async function dispatchAndExecute(
  dispatch: () => cmd.Cmd<Msg>,
  expectMsg: Msg,
  cb?: () => void
): Promise<void> {
  cb ||= () => {};
  const cmd = dispatch();
  const msg = await executeCmd(cmd);
  assert(
    msg.tag === expectMsg.tag,
    `the ${expectMsg.tag} Msg was not dispatched`
  );
  cb();
}

describe("cmd", function () {
  describe("makeDebouncedDispatch", function () {
    describe("when the debounce duration is greater than zero", function () {
      const realSetTimeout = global.setTimeout;
      const realClearTimeout = global.clearTimeout;
      let fakeClock: sinon.SinonFakeTimers;
      beforeEach(function () {
        fakeClock = sinon.useFakeTimers();
      });
      afterEach(function () {
        fakeClock.restore();
      });
      describe("and the resulting function is called once", function () {
        describe("and the debounce duration has passed", function () {
          it("returns the dispatch Msg", function (done) {
            const duration = 300;
            const dispatch = makeDebouncedDispatch(duration);
            const cmd = dispatch();
            const failureTimeout = realSetTimeout(() => {
              assert(false, "the debounced cmd did not terminate in time");
            }, duration + 50);
            executeCmd(cmd).then((msg) => {
              assert(
                msg.tag === "dispatch",
                "the dispatch Msg was not dispatched"
              );
              realClearTimeout(failureTimeout);
              done();
            });
            fakeClock.tick(duration + 1);
          });
        });
      });

      describe("and the resulting function is called multiple times during the debounce period", function () {
        describe("and the debounce duration has passed", function () {
          it("returns the noop Msg on the intermediary call and the dispatch Msg on the final call", function (done) {
            const duration = 300;
            const dispatch = makeDebouncedDispatch(duration);
            dispatchAndExecute(dispatch, adt("noop"));
            fakeClock.tick(1);
            dispatchAndExecute(dispatch, adt("noop"));
            fakeClock.tick(1);
            dispatchAndExecute(dispatch, adt("dispatch"), () => done());
            fakeClock.tick(duration + 1);
          });
        });
      });
    });
  });
});
