package com.lowloot.server;

import com.lowloot.server.repository.GameImageRepository;
import com.lowloot.server.repository.GameRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class GameController {

    private final GameRepository gameRepository;
    private final GameImageRepository gameImageRepository;

    public GameController(
            GameRepository gameRepository,
            GameImageRepository gameImageRepository) {
        this.gameRepository = gameRepository;
        this.gameImageRepository = gameImageRepository;
    }

    @GetMapping("/games")
    public List<Map<String, Object>> getGames() {

        return gameRepository.findAll().stream().map(game -> {

            Map<String, Object> data = new HashMap<>();

            data.put("id", game.getId());
            data.put("name", game.getName());
            data.put("description", game.getDescription());
            data.put("price", game.getPrice());
            data.put("genre", game.getGenre());
            data.put("developer", game.getDeveloper());
            data.put("releaseDate", game.getReleaseDate());
            data.put("discount", game.getDiscount());
            data.put("free", game.isFree());
            data.put("coverImageUrl", game.getCoverImageUrl());
            data.put("previewVideoUrl", game.getPreviewVideoUrl());

            List<GameImage> images =
                    gameImageRepository.findByGameIdOrderByDisplayOrder(game.getId());

            data.put("images", images.stream()
                    .map(GameImage::getImageUrl)
                    .toList());

            return data;

        }).toList();
    }
}