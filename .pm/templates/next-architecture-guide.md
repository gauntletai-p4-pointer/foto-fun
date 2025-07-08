# Next.js App Router Feature-Based Architecture Guide

## Overview
A modern architecture pattern for Next.js App Router applications using feature-based modules, server components, and clean separation of concerns.

## Core Structure
```
project/
  apps/
    web/                      # Next.js application
      app/                    # App Router pages (thin route layer)
        (auth)/               # Route groups for organization
          login/
          signup/
        (app)/                # Authenticated routes
          dashboard/
          posts/
          profile/
        api/                  # API routes (if not using separate backend)
      modules/                # Feature modules (business logic)
        authentication/
        posts/
        user-profile/
        shared/
      lib/                    # Core utilities, API client
      public/                 # Static assets
      
    api/                      # Separate backend (optional)
      modules/
      infrastructure/
      
  packages/                   # Shared between apps
    ui/                       # Design system components
    types/                    # Shared TypeScript types
    utils/                    # Pure utility functions
    
  infrastructure/
    database/
      migrations/
      seeds/
```

## Key Architectural Principles

### 1. **Routes Are Thin Configuration**
App Router pages should be minimal - just importing and rendering module screens:
```typescript
// app/posts/page.tsx (THIN - under 10 lines)
import { PostsModule } from '@/modules/posts';

export default function PostsPage() {
  return <PostsModule.PostListScreen />;
}

// modules/posts/screens/PostListScreen.tsx (LOGIC)
export async function PostListScreen() {
  const posts = await getPosts();
  return <PostList posts={posts} />;
}
```

### 2. **Feature Modules Own Everything**
Each module is a complete vertical slice:
```
modules/
  posts/
    components/              # UI components
      PostCard.tsx
      PostEditor.tsx
    screens/                 # Full page components
      PostListScreen.tsx
      PostDetailScreen.tsx
    hooks/                   # Client-side hooks
      usePosts.ts
      useCreatePost.ts
    services/                # API calls
      postService.ts
    server/                  # Server-only code
      actions.ts            # Server actions
      queries.ts            # Data fetching
    store/                   # Client state (Zustand)
      postStore.ts
    types/                   # Module types
      post.types.ts
    utils/                   # Module utilities
    __tests__/               # Module tests
    index.ts                 # Public API
```

### 3. **Server/Client Code Separation**
Clear boundaries between server and client code within modules:
```typescript
// modules/posts/server/queries.ts
import 'server-only';
import { cache } from 'react';

export const getPosts = cache(async () => {
  // Direct database access or API call
  return await db.posts.findMany();
});

// modules/posts/server/actions.ts
'use server';

export async function createPost(formData: FormData) {
  const data = Object.fromEntries(formData);
  const validated = postSchema.parse(data);
  
  const post = await db.posts.create({ data: validated });
  revalidatePath('/posts');
  
  return post;
}

// modules/posts/hooks/usePosts.ts
'use client';

export function usePosts(initialData?: Post[]) {
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => postService.getPosts(),
    initialData,
  });
}
```

### 4. **Data Fetching Patterns**

#### Server Components (Default)
```typescript
// modules/posts/screens/PostListScreen.tsx
import { getPosts } from '../server/queries';

export async function PostListScreen() {
  const posts = await getPosts();
  
  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

#### Client Components with Server Data
```typescript
// app/posts/page.tsx
import { getPosts } from '@/modules/posts/server';
import { PostsModule } from '@/modules/posts';

export default async function PostsPage() {
  const posts = await getPosts();
  
  return (
    <PostsModule.InteractivePostList 
      initialPosts={posts} 
    />
  );
}

// modules/posts/screens/InteractivePostList.tsx
'use client';

export function InteractivePostList({ initialPosts }: Props) {
  const { posts, refetch } = usePosts(initialPosts);
  
  return (
    <>
      <PostFilters onFilterChange={refetch} />
      <PostList posts={posts} />
    </>
  );
}
```

### 5. **Module Public API**
Each module exports only what other modules need:
```typescript
// modules/posts/index.ts
// Screens for routes
export * as PostsModule from './screens';

// Server functions
export { createPost, deletePost } from './server/actions';
export { getPosts, getPostById } from './server/queries';

// Types for other modules
export type { Post, CreatePostInput } from './types';

// Services for client components
export { postsService } from './services';

// Hooks for shared functionality
export { usePostSubscription } from './hooks';
```

## Architecture Patterns

### Loading & Error States
```typescript
// app/posts/loading.tsx
import { PostsModule } from '@/modules/posts';

export default function Loading() {
  return <PostsModule.PostListSkeleton />;
}

// app/posts/error.tsx
import { PostsModule } from '@/modules/posts';

export default function Error({ error, reset }: Props) {
  return <PostsModule.PostListError error={error} retry={reset} />;
}
```

### Parallel & Intercepting Routes
```
app/
  @modal/                    # Parallel route for modals
    (.)posts/
      [id]/
        page.tsx            # Modal view
  posts/
    [id]/
      page.tsx              # Full page view
```

### Route Groups for Organization
```
app/
  (marketing)/              # Public pages
    page.tsx               # Landing
    about/
    pricing/
    layout.tsx             # Marketing layout
  (app)/                   # Authenticated app
    dashboard/
    posts/
    settings/
    layout.tsx             # App shell layout
  (auth)/                  # Auth flow
    login/
    signup/
    layout.tsx             # Minimal auth layout
```

## State Management Patterns

### Server State (React Query/SWR)
```typescript
// modules/posts/hooks/usePosts.ts
export function usePosts(initialData?: Post[]) {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await fetch('/api/posts');
      return res.json();
    },
    initialData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
```

### Client State (Zustand)
```typescript
// modules/posts/store/postStore.ts
interface PostStore {
  // UI state only
  selectedPostId: string | null;
  isCreating: boolean;
  draftPost: Partial<Post> | null;
  
  // Actions
  selectPost: (id: string) => void;
  setDraft: (draft: Partial<Post>) => void;
  clearDraft: () => void;
}

export const usePostStore = create<PostStore>((set) => ({
  selectedPostId: null,
  isCreating: false,
  draftPost: null,
  
  selectPost: (id) => set({ selectedPostId: id }),
  setDraft: (draft) => set({ draftPost: draft }),
  clearDraft: () => set({ draftPost: null }),
}));
```

## Module Communication

### Event-Driven Updates
```typescript
// modules/posts/server/actions.ts
'use server';

import { eventBus } from '@/lib/events';

export async function createPost(data: CreatePostInput) {
  const post = await db.posts.create({ data });
  
  // Notify other modules
  await eventBus.emit('post.created', { 
    postId: post.id,
    userId: post.userId 
  });
  
  revalidatePath('/posts');
  return post;
}

// modules/notifications/server/listeners.ts
eventBus.on('post.created', async ({ userId }) => {
  await createNotification({
    userId,
    type: 'new_post',
    message: 'Your post was published!'
  });
});
```

### Shared Types Only
```typescript
// packages/types/post.ts
export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Date;
}

// Modules import shared types, not each other
import type { Post } from '@company/types';
```

## Testing Strategy

### Module Testing Structure
```
modules/posts/__tests__/
  unit/
    utils.test.ts          # Utility functions
    validators.test.ts     # Business logic
  integration/
    postService.test.ts    # API integration
    actions.test.ts        # Server actions
  components/
    PostCard.test.tsx      # Component tests
  e2e/
    post-flow.test.ts      # User journeys
```

### Testing Server Components
```typescript
// __tests__/posts/screens/PostListScreen.test.tsx
import { render } from '@testing-library/react';
import { PostListScreen } from '@/modules/posts/screens';

jest.mock('@/modules/posts/server/queries', () => ({
  getPosts: jest.fn().mockResolvedValue(mockPosts)
}));

test('renders posts', async () => {
  const component = await PostListScreen();
  const { container } = render(component);
  
  expect(container).toHaveTextContent('Post Title');
});
```

## Performance Patterns

### Dynamic Imports for Code Splitting
```typescript
// app/posts/new/page.tsx
import dynamic from 'next/dynamic';

const PostEditor = dynamic(
  () => import('@/modules/posts').then(mod => mod.PostsModule.PostEditor),
  { 
    loading: () => <EditorSkeleton />,
    ssr: false // For client-only components
  }
);

export default function NewPostPage() {
  return <PostEditor />;
}
```

### Image Optimization
```typescript
// modules/posts/components/PostCard.tsx
import Image from 'next/image';

export function PostCard({ post }: Props) {
  return (
    <article>
      <Image
        src={post.coverImage}
        alt={post.title}
        width={400}
        height={300}
        placeholder="blur"
        blurDataURL={post.blurDataURL}
      />
    </article>
  );
}
```

## Common Patterns

### Form Handling with Server Actions
```typescript
// modules/posts/components/PostForm.tsx
import { createPost } from '../server/actions';

export function PostForm() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <SubmitButton />
    </form>
  );
}

// Progressive enhancement - works without JS
```

### Optimistic Updates
```typescript
// modules/posts/hooks/useCreatePost.ts
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createPost,
    onMutate: async (newPost) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      
      // Optimistic update
      const previous = queryClient.getQueryData(['posts']);
      queryClient.setQueryData(['posts'], old => [...old, newPost]);
      
      return { previous };
    },
    onError: (err, newPost, context) => {
      // Rollback on error
      queryClient.setQueryData(['posts'], context.previous);
    }
  });
}
```

## Deployment Considerations

### Environment Variables
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  // ... other env vars
});

export const env = envSchema.parse(process.env);
```

### Edge Runtime Compatibility
```typescript
// modules/posts/server/queries.ts
export const runtime = 'edge'; // For edge runtime

export async function getPosts() {
  // Use fetch instead of database libraries
  const res = await fetch(process.env.API_URL + '/posts');
  return res.json();
}
```

## Migration from Pages Router

1. Move pages to app directory as thin routes
2. Extract logic into modules
3. Convert getServerSideProps to server components
4. Replace API routes with server actions
5. Update data fetching to use React Query with initial data

## Best Practices

1. **Keep app/ directory minimal** - Just routing configuration
2. **Modules are portable** - Should work with any routing solution
3. **Colocate related code** - Tests, types, and utils in modules
4. **Use Server Components by default** - Add 'use client' only when needed
5. **Leverage Server Actions** - For forms and mutations
6. **Type-safe environment variables** - Validate at build time
7. **Error boundaries at module level** - Contain failures

## Common Pitfalls to Avoid

- Business logic in app/ directory
- Importing module internals (not from index.ts)
- Client components for static content
- Over-fetching in server components
- Shared state between modules
- Database queries in client components