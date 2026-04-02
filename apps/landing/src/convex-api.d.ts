declare module "@convex/_generated/api" {
  import type { FunctionReference } from "convex/server";

  export const api: {
    cms: {
      getPage: FunctionReference<
        "query",
        "public",
        { slug: string },
        {
          _id: string;
          slug: string;
          title: string;
          sections: Array<{
            id: string;
            type: string;
            title?: string;
            subtitle?: string;
            content?: string;
            items?: Array<{
              title?: string;
              description?: string;
              icon?: string;
            }>;
            cta?: { text: string; href: string };
            imageUrl?: string;
            order: number;
          }>;
          published: boolean;
          updatedAt: number;
        } | null
      >;
      listPages: FunctionReference<
        "query",
        "public",
        Record<string, never>,
        Array<{
          _id: string;
          slug: string;
          title: string;
          sections: Array<{
            id: string;
            type: string;
            title?: string;
            subtitle?: string;
            content?: string;
            items?: Array<{
              title?: string;
              description?: string;
              icon?: string;
            }>;
            cta?: { text: string; href: string };
            imageUrl?: string;
            order: number;
          }>;
          published: boolean;
          updatedAt: number;
        }>
      >;
    };
  };
}
