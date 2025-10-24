import { z, ZodBoolean, ZodDate, ZodEnum, ZodNumber, ZodString, ZodType } from "zod";

type InputType<DefaultType extends ZodType> = {
    (): DefaultType;
    <ProvidedType extends ZodType>(
        schema: ProvidedType
    ): ProvidedType;
};

const stripEmpty = z.literal("").transform(() => undefined);

const preprocessIfValid = (schema: ZodType) => (val: unknown) => {
    const result = schema.safeParse(val);
    if (result.success) return result.data;
    return val;
};

export const string: InputType<ZodString> = (schema = z.string()) =>
    z.preprocess(preprocessIfValid(stripEmpty), schema) as any;

export const number: InputType<ZodNumber> = (schema = z.number()) =>
    z.preprocess(
        preprocessIfValid(
            z.union([
                stripEmpty,
                z
                    .string()
                    .transform((val) => Number(val))
                    .refine((val) => !Number.isNaN(val)),
            ])
        ),
        schema
    ) as any;

export const boolean: InputType<ZodBoolean> = (schema = z.boolean()) =>
    z.preprocess(
        preprocessIfValid(
            z.union([
                stripEmpty,
                z.literal('true').transform(() => true),
                z.literal('false').transform(() => false),
            ])
        ),
        schema
    ) as any;

const isDate = (val: unknown): val is Date => val instanceof Date;

export const date: InputType<ZodDate> = (schema = z.date()) =>
    z.preprocess(
        preprocessIfValid(
            z.union([
                stripEmpty,
                z
                    .string()
                    .transform((val) => new Date(val))
                    .refine((val) => isDate(val)),
            ])
        ),
        schema
    ) as any;


export const enum_: InputType<ZodEnum<any>> = (schema = z.enum([""] as const)) => {
    const enumValues = schema.options;
    const enumKeys = Object.keys(enumValues);
    // @ts-expect-error we are using enumValues's keys so this is fine
    const enumValuesArray = enumKeys.map((key) => enumValues[key]);

    return z.preprocess(
        preprocessIfValid(
            z.union([
                z.literal("").transform(() => ""),
                z
                    .string()
                    .transform((val) => {
                        const enumIndex = enumKeys.indexOf(val);
                        if (enumIndex === -1) return val;
                        return enumValuesArray[enumIndex];
                    })
                    .refine((val) => enumValuesArray.includes(val)),
            ])
        ),
        schema
    ) as any;
}