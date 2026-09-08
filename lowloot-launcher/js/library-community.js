// library-community.js — sección Comunidad de la ficha de Biblioteca: publicaciones
// mock, likes y comentarios simulados en memoria (sin backend todavía).
// Depende de helpers.js y state.js (communityLikedPosts, communityUserComments).

function communityCommentsHtml(postId, mockComments) {
  const added = communityUserComments.get(postId) || [];
  const all = [...mockComments, ...added];

  if (!all.length) {
    return `<p class="community-no-comments">Sé el primero en comentar.</p>`;
  }

  return all
    .map(
      (c) => `
    <div class="community-comment">
      <span class="community-comment-user">${escapeHtml(c.user)}</span>
      <span class="text-muted"> · ${c.date ? formatDate(c.date) : 'ahora'}</span>
      <p class="community-comment-text">${escapeHtml(c.text)}</p>
    </div>
  `
    )
    .join('');
}

function renderCommunitySection(game) {
  const posts = game.communityPosts || [];
  if (!posts.length) {
    return `<p class="placeholder-text">Todavía no hay actividad de la comunidad para este juego.</p>`;
  }

  const postsHtml = posts
    .map((post) => {
      const liked = communityLikedPosts.has(post.id);
      const likeCount = post.likes + (liked ? 1 : 0);
      const addedComments = communityUserComments.get(post.id) || [];
      const totalComments = post.comments.length + addedComments.length;

      return `
      <article class="community-post" data-post-id="${post.id}">
        <div class="community-post-header">
          <span class="community-avatar" aria-hidden="true"></span>
          <div>
            <span class="community-user">${escapeHtml(post.user)}</span>
            <span class="community-date text-muted">${formatDate(post.date)}</span>
          </div>
        </div>
        <h4 class="community-post-title">${escapeHtml(post.title)}</h4>
        <p class="community-post-content">${escapeHtml(post.content)}</p>

        <div class="community-post-actions">
          <button type="button" class="community-like-btn ${liked ? 'liked' : ''}" data-community-like="${post.id}">
            <span class="like-icon">${liked ? '♥' : '♡'}</span> ${likeCount}
          </button>
          <button type="button" class="community-comment-toggle" data-community-toggle-comments="${post.id}">
            Ver comentarios (${totalComments})
          </button>
        </div>

        <div class="community-comments" id="comments-${post.id}">
          <div class="community-comments-list">${communityCommentsHtml(post.id, post.comments)}</div>
          <div class="community-comment-form">
            <input type="text" class="community-comment-input" id="comment-input-${post.id}" placeholder="Escribí un comentario..." />
            <button type="button" class="btn-primary lib-action-btn-small" data-community-comment-submit="${post.id}">Comentar</button>
          </div>
        </div>
      </article>
    `;
    })
    .join('');

  return `<div class="community-list">${postsHtml}</div>`;
}

function toggleCommunityLike(btn) {
  const postId = btn.dataset.communityLike;
  const game = libraryCache?.find((g) => g.gameId === currentLibraryGameId);
  const post = game?.communityPosts.find((p) => p.id === postId);
  if (!post) return;

  if (communityLikedPosts.has(postId)) communityLikedPosts.delete(postId);
  else communityLikedPosts.add(postId);

  const nowLiked = communityLikedPosts.has(postId);
  const count = post.likes + (nowLiked ? 1 : 0);

  btn.classList.toggle('liked', nowLiked);
  btn.innerHTML = `<span class="like-icon">${nowLiked ? '♥' : '♡'}</span> ${count}`;
}

function toggleCommunityComments(btn) {
  const postId = btn.dataset.communityToggleComments;
  const panel = document.getElementById(`comments-${postId}`);
  if (!panel) return;

  const isOpen = panel.classList.toggle('open');
  const countMatch = btn.textContent.match(/\((\d+)\)/);
  const count = countMatch ? countMatch[1] : '0';
  btn.textContent = `${isOpen ? 'Ocultar comentarios' : 'Ver comentarios'} (${count})`;
}

function submitCommunityComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  if (!communityUserComments.has(postId)) communityUserComments.set(postId, []);
  communityUserComments.get(postId).push({ user: 'Luk', date: null, text });
  input.value = '';

  const game = libraryCache?.find((g) => g.gameId === currentLibraryGameId);
  const post = game?.communityPosts.find((p) => p.id === postId);
  if (post) {
    const listEl = document.querySelector(`#comments-${postId} .community-comments-list`);
    if (listEl) listEl.innerHTML = communityCommentsHtml(postId, post.comments);

    const totalComments = post.comments.length + communityUserComments.get(postId).length;
    const toggleBtn = document.querySelector(`[data-community-toggle-comments="${postId}"]`);
    if (toggleBtn) {
      const wasOpen = document.getElementById(`comments-${postId}`)?.classList.contains('open');
      toggleBtn.textContent = `${wasOpen ? 'Ocultar comentarios' : 'Ver comentarios'} (${totalComments})`;
    }
  }

  showToast('Comentario publicado');
}
