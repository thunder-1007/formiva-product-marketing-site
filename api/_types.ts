export type ApiRequest = {
  method?: string;
  body?: unknown;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  setHeader?: (name: string, value: string) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};
