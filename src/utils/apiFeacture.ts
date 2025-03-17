import Joi from "joi";
import { Types } from "mongoose";
import { PipelineStage } from "mongoose";

export function paginate(page: number, size: number) {
  if (!page || page <= 0) {
    page = 1;
  }

  if (!size || size <= 0) {
    size = 2;
  }

  const skip = (page - 1) * size;
  return { limit: size, skip };
}

type MatchParams = {
  fields: string[];
  search?: string | null;
  op: "$or" | "$and";
};

type LookupParams = {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
};

type ProjectionParams = {
  allowFields: string[];
  select?: string;
  defaultFields: string[];
};

type MatchIdParams = {
  Id: Types.ObjectId;
  field: string;
};

const matchSchema = Joi.object({
  fields: Joi.array().items(Joi.string()).min(1).required(),
  search: Joi.string().allow("", null),
  op: Joi.string().valid("$or", "$and").required(),
});

export default class ApiPipeline {
  private pipeline: object[];

  constructor() {
    this.pipeline = [];
  }

  match(params: MatchParams): this {
    const { error, value } = matchSchema.validate(params);
    if (error) {
      throw new Error(`Validation error in match: ${error.message}`);
    }
    const { fields, search, op } = value;
    if (!search) return this;
    const searchQuery = fields.map((field: string) => ({
      [field]: { $regex: search, $options: "i" },
    }));
    this.pipeline.push({ $match: { [op]: searchQuery } });
    return this;
  }

  sort(sortText?: string): this {
    if (!sortText) return this;

    const sortFields: Record<string, 1 | -1> = {};
    sortText.split(",").forEach((item) => {
      const [field, order] = item.split(":");
      sortFields[field.trim()] = order.trim().toLowerCase() === "desc" ? -1 : 1;
    });

    this.pipeline.push({ $sort: sortFields });
    return this;
  }

  matchId(params: MatchIdParams): this {
    const { Id, field } = params;
    if (!Id) return this;
    if (!Types.ObjectId.isValid(Id)) {
      throw new Error("Invalid ObjectId");
    }
    this.pipeline.push({ $match: { [field]: new Types.ObjectId(Id) } });
    return this;
  }

  lookUp(params: LookupParams): this {
    this.pipeline.push({
      $lookup: {
        from: params.from,
        localField: params.localField,
        foreignField: params.foreignField,
        as: params.as,
      },
    });
    return this;
  }

  projection(params: ProjectionParams): this {
    const { allowFields, select, defaultFields } = params;
    const selectedFields = select
      ? select.split(",").map((f) => f.trim())
      : defaultFields;
    const fieldWanted = selectedFields.filter((field) =>
      allowFields.includes(field)
    );

    if (fieldWanted.length > 0) {
      const projection = fieldWanted.reduce<Record<string, 1>>((acc, field) => {
        acc[field] = 1;
        return acc;
      }, {});
      this.pipeline.push({ $project: projection });
    }
    return this;
  }

  paginate(page: number, size: number): this {
    const { limit, skip } = paginate(page, size);
    this.pipeline.push({ $skip: Number(skip) });
    this.pipeline.push({ $limit: Number(limit) });
    return this;
  }

  addStage(stage: object): this {
    if (typeof stage !== "object" || Array.isArray(stage)) {
      throw new Error("Stage must be a valid object");
    }
    this.pipeline.push(stage);
    return this;
  }

  build(): PipelineStage[] {
    return this.pipeline as PipelineStage[];
  }
}
