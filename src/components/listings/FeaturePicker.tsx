import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { useFeatureSuggestions } from '../../hooks/useFeatureSuggestions';

interface Props {
  selected: string[];
  onAdd: (feature: string) => void;
  onRemove: (feature: string) => void;
}

export default function FeaturePicker({ selected, onAdd, onRemove }: Props) {
  const { suggestions, isLoading } = useFeatureSuggestions();
  const [inputValue, setInputValue] = useState('');
  const [filterValue, setFilterValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !selected.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      onAdd(trimmed);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const filteredSuggestions = useMemo(() => {
    const selectedLower = new Set(selected.map((s) => s.toLowerCase()));
    const filterLower = filterValue.toLowerCase();
    return suggestions.filter(
      (s) => !selectedLower.has(s.toLowerCase()) && s.toLowerCase().includes(filterLower),
    );
  }, [suggestions, selected, filterValue]);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Add a feature..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ flex: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          sx={{ textTransform: 'none' }}
        >
          Add
        </Button>
      </Stack>

      {selected.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {selected.map((feature) => (
            <Chip
              key={feature}
              label={feature}
              size="small"
              color="primary"
              variant="filled"
              onDelete={() => onRemove(feature)}
            />
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2 }}>
        <Typography variant="caption" color="text.secondary">Suggestions</Typography>
      </Divider>

      <TextField
        size="small"
        placeholder="Filter suggestions..."
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1.5 }}
      />

      {isLoading ? (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rounded" width={90} height={24} />
          ))}
        </Stack>
      ) : filteredSuggestions.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {filteredSuggestions.map((feature) => (
            <Chip
              key={feature}
              label={feature}
              size="small"
              variant="outlined"
              onClick={() => onAdd(feature)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {filterValue ? 'No matching suggestions' : 'No suggestions available'}
        </Typography>
      )}
    </Box>
  );
}
