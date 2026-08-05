package com.cristian.nbastats.player;

import com.cristian.nbastats.config.SecurityConfig;
import com.cristian.nbastats.error.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {PlayerController.class, GlobalExceptionHandler.class})
@Import(SecurityConfig.class)
class PlayerControllerTest {

    private static final String VALID_PLAYER_JSON = """
            {
              "name": "Test Player",
              "team": "LAL",
              "position": "PG",
              "ppg": 10,
              "rpg": 5,
              "apg": 4,
              "fg_percent": 45,
              "three_pt_percent": 36,
              "season": 2025
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PlayerService playerService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void createPlayerReturnsStructuredValidationErrors() throws Exception {
        mockMvc.perform(post("/api/v1/players")
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "",
                                  "team": "LAL",
                                  "position": "INVALID",
                                  "ppg": -1,
                                  "rpg": 8,
                                  "apg": 7,
                                  "fg_percent": 101,
                                  "three_pt_percent": 36,
                                  "season": 2023
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request validation failed."))
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.position").exists())
                .andExpect(jsonPath("$.fieldErrors.ppg").exists())
                .andExpect(jsonPath("$.fieldErrors.fgPercent").exists());
    }

    @Test
    void getPlayerReturnsCleanNotFoundError() throws Exception {
        when(playerService.getPlayerById(999))
                .thenThrow(new PlayerNotFoundException("Player with id 999 was not found."));

        mockMvc.perform(get("/api/v1/players/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Player with id 999 was not found."))
                .andExpect(jsonPath("$.path").value("/api/v1/players/999"));
    }

    @Test
    void paginatedQueryRejectsOversizedPage() throws Exception {
        mockMvc.perform(get("/api/v1/players/page").param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("size must be at most 100"));
    }

    @Test
    void numericFiltersRejectNegativeValues() throws Exception {
        mockMvc.perform(get("/api/v1/players/filter").param("minPpg", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void readEndpointsStayPublic() throws Exception {
        mockMvc.perform(get("/api/v1/players"))
                .andExpect(status().isOk());
    }

    @Test
    void writeEndpointsRejectAnonymousCallers() throws Exception {
        mockMvc.perform(post("/api/v1/players")
                        .contentType("application/json")
                        .content(VALID_PLAYER_JSON))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/v1/players/1")
                        .contentType("application/json")
                        .content(VALID_PLAYER_JSON))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/v1/players/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void writeEndpointsRejectAuthenticatedNonAdmins() throws Exception {
        mockMvc.perform(delete("/api/v1/players/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void writeEndpointsAllowAdmins() throws Exception {
        mockMvc.perform(delete("/api/v1/players/1"))
                .andExpect(status().isNoContent());
    }
}
