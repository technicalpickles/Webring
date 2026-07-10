export interface Member {
  slug: string;
  name: string;
  url: string;
  owner: string;
  tag: string;
  badge?: string;
  rss?: string;
  joined: string;
}

export interface Ring {
  name: string;
  url: string;
  members: Member[];
}
