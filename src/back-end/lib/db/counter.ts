import { tryDb } from "back-end/lib/db";
import { valid } from "shared/lib/http";
import { Counter } from "shared/lib/resources/counter";

export const incrementCounters = tryDb<[string[]], Record<string, number>>(
  async (connection, names) => {
    // Update existing counters
    const existingCounters: { name: string }[] = await connection<Counter>(
      "viewCounters"
    )
      .whereIn("name", names)
      .increment("count")
      .update({}, "name");

    // Create new counters where applicable
    for (const name of names) {
      if (!existingCounters.some(({ name: eName }) => eName === name)) {
        await connection<Counter>("viewCounters").insert({
          name,
          count: 1
        });
      }
    }

    return await getCounters(connection, names);
  }
);

export const getCounters = tryDb<[string[]], Record<string, number>>(
  async (connection, names) => {
    let query = connection<Counter>("viewCounters").select("*");

    if (names.length > 0) {
      query = query.whereIn("name", names);
    }

    const counters = await query;

    const record: Record<string, number> = {};
    for (const counter of counters) {
      record[counter.name] = counter.count;
    }
    return valid(record);
  }
);
