package com.example.backend.controller;

import com.example.backend.service.PostService;
import com.example.backend.repository.UserRepository;
import com.example.backend.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    @Autowired
    private PostService postService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getAllPosts(
            Authentication authentication,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String authorId,
            @RequestParam(required = false) String limit // Ignored in simple impl for now or add stream limit
    ) {
        Long currentUserId = null;
        if (authentication != null) {
            currentUserId = userRepository.findByUsername(authentication.getName()).get().getId();
        }

        Long authorIdLong = null;
        if (authorId != null)
            authorIdLong = Long.parseLong(authorId);

        List<Map<String, Object>> posts = postService.getAllPosts(currentUserId, filter, tag, date, authorIdLong);

        if (limit != null) {
            try {
                int limitVal = Integer.parseInt(limit);
                if (limitVal > 0 && limitVal < posts.size()) {
                    posts = posts.subList(0, limitVal);
                }
            } catch (NumberFormatException e) {
                // Ignore
            }
        }

        return ResponseEntity.ok(posts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPostById(@PathVariable Long id, Authentication authentication) {
        Long currentUserId = null;
        if (authentication != null) {
            currentUserId = userRepository.findByUsername(authentication.getName()).get().getId();
        }
        try {
            return ResponseEntity.ok(postService.getPostById(id, currentUserId));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", "Post not found"));
        }
    }

    @PostMapping
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> payload, Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).build();

        Long start = System.currentTimeMillis();
        String username = authentication.getName();
        Long userId = userRepository.findByUsername(username).get().getId();

        try {
            Map<String, Object> post = postService.createPost(
                    userId,
                    (String) payload.get("title"),
                    (String) payload.get("content"),
                    (String) payload.get("image"),
                    (String) payload.get("status"),
                    (String) payload.get("publishAt"),
                    (List<Long>) payload.get("tags"));
            return ResponseEntity.ok(post);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePost(@PathVariable Long id, @RequestBody Map<String, String> payload,
            Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).build();
        Long userId = userRepository.findByUsername(authentication.getName()).get().getId();
        try {
            postService.updateStatus(id, userId, payload.get("status"));
            return ResponseEntity.ok(Map.of("message", "Updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable Long id, Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).build();
        Long userId = userRepository.findByUsername(authentication.getName()).get().getId();
        try {
            postService.deletePost(id, userId);
            return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<?> toggleLike(@PathVariable Long id, Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).build();
        Long userId = userRepository.findByUsername(authentication.getName()).get().getId();
        boolean liked = postService.toggleLike(id, userId);
        return ResponseEntity.ok(Map.of("liked", liked));
    }

    @PostMapping("/{id}/favorite")
    public ResponseEntity<?> toggleFavorite(@PathVariable Long id, Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).build();
        Long userId = userRepository.findByUsername(authentication.getName()).get().getId();
        boolean favorited = postService.toggleFavorite(id, userId);
        return ResponseEntity.ok(Map.of("favorited", favorited));
    }

    @GetMapping("/dates")
    public ResponseEntity<?> getPostDates(Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.ok(List.of()); // Or 401? Node returns empty array logic or error. Node checks
                                                 // req.user.
        Long userId = userRepository.findByUsername(authentication.getName()).get().getId();
        return ResponseEntity.ok(postService.getPostDates(userId));
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<?> getPostsByUser(@PathVariable String username, Authentication authentication) {
        // This is redundant with getAllPosts(authorId) but kept for route compatibility
        Long currentUserId = null;
        if (authentication != null) {
            currentUserId = userRepository.findByUsername(authentication.getName()).get().getId();
        }

        Optional<User> targetUser = userRepository.findByUsername(username);
        if (targetUser.isEmpty())
            return ResponseEntity.ok(List.of());

        // Re-use logic.
        // But wait, getPostsByUser in Node.js returns specific format and logic.
        // Let's just use service call logic if we want strict compatibility or
        // redirect.
        // Let's call service method getAllPosts with authorId filter

        return ResponseEntity.ok(postService.getAllPosts(currentUserId, null, null, null, targetUser.get().getId()));
    }
}
