import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, Circle } from 'react-leaflet';
import { LatLngBounds, LatLng } from 'leaflet';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Table,
  Button,
  Input,
  IconButton,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Select,
  Option,
  Modal,
  ModalDialog,
  ModalClose,
} from '@mui/joy';
import { useMediaQuery, useTheme, ClickAwayListener } from '@mui/material';
import {
  LocationOn,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  VisibilityOff as VisibilityOffIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { getGlobalStations, getAdminStations, adminHideStation, adminDeleteStation } from '../api';
import type { Station } from '../api';
import 'leaflet/dist/leaflet.css';
import ThemeAwareTileLayer from './ThemeAwareTileLayer';

// Fix for default markers in React Leaflet
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const AdminStationsMap: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'map' | 'table'>('map');
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table-specific state
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  }>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineFilter, setOnlineFilter] = useState<string>("all"); // 'all', 'true', 'false'
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all"); // 'all', 'true', 'false'
  const [openMenuStationId, setOpenMenuStationId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    station: Station | null;
  }>({
    open: false,
    station: null,
  });
  const [deletingStationId, setDeletingStationId] = useState<string | null>(null);
  const [hidingStationId, setHidingStationId] = useState<string | null>(null);
  const menuButtonRef = useRef<{ [key: string]: HTMLElement | null }>({});

  // Check if coordinates appear to be rounded/rough vs precise
  const isRoughLocation = (lat: number, lng: number): boolean => {
    // Convert to strings and check decimal places
    const latStr = lat.toString();
    const lngStr = lng.toString();

    // If coordinates have very few decimal places or are at whole numbers, consider them rough
    const latDecimals = latStr.split('.')[1]?.length || 0;
    const lngDecimals = lngStr.split('.')[1]?.length || 0;

    // Rough if both coordinates have 2 or fewer decimal places
    return latDecimals <= 2 && lngDecimals <= 2;
  };

  const fetchStations = async (
    page: number = 1,
    search: string = "",
    online?: boolean,
    isPublic?: boolean,
    hidden?: boolean
  ) => {
    try {
      setLoading(true);

      // Use admin API for table view, global API for map view
      let data;
      if (activeTab === 'table') {
        const response = await getAdminStations(page, pagination.limit, search);
        data = response.stations;
        setPagination(response.pagination);
      } else {
        // For map view, use global stations
        data = await getGlobalStations(
          pagination.limit,
          page,
          "created_at",
          "desc",
          search
        );
        // Apply client-side filters for online and hidden status
        let filteredData = data;
        if (online !== undefined) {
          filteredData = filteredData.filter(station => station.is_online === online);
        }
        if (hidden !== undefined) {
          filteredData = filteredData.filter(station => station.hidden === hidden);
        }
        data = filteredData;
        // For client-side filtering, we need to calculate pagination manually
        setPagination(prev => ({
          ...prev,
          page,
          total: filteredData.length,
          pages: Math.ceil(filteredData.length / prev.limit),
        }));
      }

      setStations(data);
      setError(null);
    } catch (err) {
      setError('Failed to load stations');
      console.error('Error fetching stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page when searching
    const online = onlineFilter === "all" ? undefined : onlineFilter === "true";
    const hidden = visibilityFilter === "all" ? undefined : visibilityFilter === "true";
    fetchStations(1, searchQuery, online, undefined, hidden);
  };

  const handleRefresh = () => {
    const online = onlineFilter === "all" ? undefined : onlineFilter === "true";
    const hidden = visibilityFilter === "all" ? undefined : visibilityFilter === "true";
    fetchStations(pagination.page, searchQuery, online, undefined, hidden);
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    const online = onlineFilter === "all" ? undefined : onlineFilter === "true";
    const hidden = visibilityFilter === "all" ? undefined : visibilityFilter === "true";
    fetchStations(newPage, searchQuery, online, undefined, hidden);
  };

  const handleViewStationDetails = (stationId: string) => {
    navigate(`/admin/stations/${stationId}`);
  };

  const handleDeleteStation = async (stationId: string) => {
    try {
      setDeletingStationId(stationId);
      await adminDeleteStation(stationId);
      setDeleteDialog({ open: false, station: null });

      // Refresh the current page to get updated data from server
      const online = onlineFilter === "all" ? undefined : onlineFilter === "true";
      const isPublic = visibilityFilter === "all" ? undefined : visibilityFilter === "true";
      await fetchStations(pagination.page, searchQuery, online, isPublic);
    } catch (err) {
      setError('Failed to delete station');
      console.error('Error deleting station:', err);
    } finally {
      setDeletingStationId(null);
    }
  };

  const handleHideStation = async (stationId: string, hidden: boolean) => {
    try {
      setHidingStationId(stationId);
      await adminHideStation(stationId, hidden);

      // Refresh the current page to get updated data from server
      const online = onlineFilter === "all" ? undefined : onlineFilter === "true";
      const hiddenFilter = visibilityFilter === "all" ? undefined : visibilityFilter === "true";
      await fetchStations(pagination.page, searchQuery, online, undefined, hiddenFilter);
    } catch (err) {
      setError(`Failed to ${hidden ? 'hide' : 'unhide'} station`);
      console.error('Error hiding station:', err);
    } finally {
      setHidingStationId(null);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStations(pagination.page, searchQuery);
  }, []);

  // Filter stations with coordinates
  const stationsWithCoords = stations.filter(station => station.latitude && station.longitude);

  // Calculate bounds to fit all markers
  const getBounds = () => {
    if (stationsWithCoords.length === 0) return undefined;

    const bounds = new LatLngBounds(
      stationsWithCoords.map(station => new LatLng(station.latitude!, station.longitude!))
    );
    return bounds;
  };

  // Default center if no stations with coordinates
  const defaultCenter: [number, number] = [20, 0]; // Roughly center of the world
  const defaultZoom = 2;

  if (loading && activeTab === 'map') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert color="danger" variant="soft">
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 3, textAlign: "center" }}>
        Station Management
      </Typography>

      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value as 'map' | 'table')}>
        <TabList>
          <Tab value="map">Map View</Tab>
          <Tab value="table">Table View</Tab>
        </TabList>

        <TabPanel value="map" sx={{ p: 0 }}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn sx={{ color: 'primary.500' }} />
                  <Typography level="h4">
                    Station Locations ({stationsWithCoords.length} of {stations.length} stations)
                  </Typography>
                </Box>

                <Typography level="body-sm" color="neutral">
                  This map shows the rough locations of all registered stations that have coordinate data.
                  Stations without coordinates are not displayed.
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ height: '600px', position: 'relative' }}>
              <MapContainer
                center={stationsWithCoords.length > 0 ? undefined : defaultCenter}
                zoom={stationsWithCoords.length > 0 ? undefined : defaultZoom}
                bounds={getBounds()}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <ThemeAwareTileLayer />
                {stationsWithCoords.map((station: Station) => {
                  const roughLocation = isRoughLocation(station.latitude!, station.longitude!);
                  return (
                    <React.Fragment key={station.id}>
                      {roughLocation && (
                        <Circle
                          center={[station.latitude!, station.longitude!]}
                          radius={2000}
                          pathOptions={{
                            color: station.is_online ? '#10b981' : '#ef4444',
                            fillColor: station.is_online ? '#10b981' : '#ef4444',
                            fillOpacity: 0.1,
                            weight: 1,
                          }}
                        />
                      )}
                      <Marker
                        position={[station.latitude!, station.longitude!]}
                      >
                        <Popup>
                          <Box sx={{ textAlign: 'center', minWidth: '200px' }}>
                            <Typography level="title-sm" fontWeight="bold" sx={{ color: 'common.black' }}>
                              {station.name}
                            </Typography>
                            <Typography level="body-xs" sx={{ mt: 0.5, color: 'common.black' }}>
                              {station.location}
                            </Typography>
                            <Typography level="body-xs" sx={{ color: 'neutral.600', mt: 0.5 }}>
                              {station.latitude!.toFixed(4)}, {station.longitude!.toFixed(4)}
                            </Typography>
                            {station.user && (
                              <Typography level="body-xs" sx={{ color: 'primary.600', mt: 0.5 }}>
                                Owner: {station.user.display_name || station.user.username}
                              </Typography>
                            )}
                            <Typography level="body-xs" sx={{ color: station.is_online ? 'success.600' : 'danger.600', mt: 0.5 }}>
                              Status: {station.is_online ? 'Online' : 'Offline'}
                            </Typography>
                            <Typography level="body-xs" sx={{ color: 'neutral.500', mt: 0.5, fontSize: '0.7rem' }}>
                              {roughLocation ? 'Approximate location' : 'Precise location'}
                            </Typography>
                          </Box>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </Box>
          </Card>
        </TabPanel>

        <TabPanel value="table" sx={{ p: 0 }}>
          {error && (
            <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Search and Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={isMobile ? "column" : "row"}
                  spacing={2}
                  alignItems={isMobile ? "stretch" : "center"}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Input
                      key="search-input"
                      placeholder="Search by station name, location, or owner username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleSearch();
                        }
                      }}
                      startDecorator={<SearchIcon />}
                      endDecorator={
                        searchQuery && (
                          <IconButton size="sm" onClick={() => setSearchQuery("")}>
                            <ClearIcon />
                          </IconButton>
                        )
                      }
                      sx={{ width: "100%" }}
                    />
                  </Box>
                  <Button
                    variant="solid"
                    onClick={handleSearch}
                    startDecorator={<SearchIcon />}
                    sx={{ minWidth: isMobile ? "100%" : "auto" }}
                  >
                    Search
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleRefresh}
                    startDecorator={<RefreshIcon />}
                    sx={{ minWidth: isMobile ? "100%" : "auto" }}
                  >
                    Refresh
                  </Button>
                </Stack>

                {/* Filters */}
                <Stack
                  direction={isMobile ? "column" : "row"}
                  spacing={2}
                  alignItems={isMobile ? "stretch" : "center"}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="body-sm" sx={{ mb: 1 }}>
                      Online Status:
                    </Typography>
                    <Select
                      size="sm"
                      value={onlineFilter}
                      onChange={(_, value) => setOnlineFilter(value || "all")}
                      sx={{ minWidth: 120 }}
                    >
                      <Option value="all">All Stations</Option>
                      <Option value="true">Online</Option>
                      <Option value="false">Offline</Option>
                    </Select>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography level="body-sm" sx={{ mb: 1 }}>
                      Visibility:
                    </Typography>
                    <Select
                      size="sm"
                      value={visibilityFilter}
                      onChange={(_, value) => setVisibilityFilter(value || "all")}
                      sx={{ minWidth: 120 }}
                    >
                      <Option value="all">All Stations</Option>
                      <Option value="true">Visible</Option>
                      <Option value="false">Hidden</Option>
                    </Select>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: { xs: 1, md: 2 } }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
                  <CircularProgress />
                </Box>
              ) : isMobile ? (
                // Mobile card layout
                <Stack spacing={2}>
                  {stations.map((station: Station) => (
                    <Card key={station.id} variant="outlined">
                      <CardContent sx={{ p: 2, position: "relative" }}>
                        {/* Menu button */}
                        <IconButton
                          ref={(el) => {
                            menuButtonRef.current[station.id] = el;
                          }}
                          size="sm"
                          variant="plain"
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            zIndex: 1,
                          }}
                          onClick={() =>
                            setOpenMenuStationId(
                              openMenuStationId === station.id ? null : station.id
                            )
                          }
                        >
                          <MoreVertIcon />
                        </IconButton>

                        {/* View button */}
                        <IconButton
                          size="sm"
                          variant="plain"
                          sx={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            zIndex: 1,
                          }}
                          onClick={() => handleViewStationDetails(station.id)}
                        >
                          <ViewIcon />
                        </IconButton>

                        <Stack spacing={2}>
                          {/* Header with name and status */}
                          <Box>
                            <Typography level="body-lg" fontWeight="bold">
                              {station.name}
                            </Typography>
                            <Typography level="body-sm" color="neutral">
                              {station.location}
                            </Typography>
                          </Box>

                          {/* Owner info */}
                          {station.user && (
                            <Box>
                              <Typography level="body-sm">
                                <strong>Owner:</strong>{" "}
                                <Typography
                                  component="span"
                                  sx={{
                                    cursor: "pointer",
                                    "&:hover": { textDecoration: "underline" },
                                  }}
                                  onClick={() =>
                                    navigate(`/admin/users/${station.user!.id}`)
                                  }
                                >
                                  {station.user.display_name || station.user.username}
                                </Typography>
                              </Typography>
                            </Box>
                          )}

                          {/* Status and visibility */}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              size="sm"
                              color={station.is_online ? "success" : "danger"}
                              variant="soft"
                            >
                              {station.is_online ? "Online" : "Offline"}
                            </Chip>
                            <Chip
                              size="sm"
                              color={station.hidden ? "warning" : "success"}
                              variant="soft"
                            >
                              {station.hidden ? "Hidden" : "Visible"}
                            </Chip>
                            <Typography level="body-xs" color="neutral">
                              {new Date(station.created_at).toLocaleDateString("de-DE")}
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>

                      {/* Mobile menu */}
                      {isMobile && openMenuStationId === station.id && (
                        <ClickAwayListener
                          onClickAway={() => setOpenMenuStationId(null)}
                          mouseEvent="onMouseDown"
                          touchEvent="onTouchStart"
                        >
                          <Menu
                            anchorEl={menuButtonRef.current[station.id]}
                            open={openMenuStationId === station.id}
                            onClose={() => setOpenMenuStationId(null)}
                            placement="bottom-end"
                          >
                            <MenuItem
                              onClick={() => {
                                handleViewStationDetails(station.id);
                                setOpenMenuStationId(null);
                              }}
                            >
                              <ViewIcon sx={{ mr: 1 }} />
                              View Details
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                handleHideStation(station.id, !station.hidden);
                                setOpenMenuStationId(null);
                              }}
                              disabled={hidingStationId === station.id}
                            >
                              {station.hidden ? (
                                <ViewIcon sx={{ mr: 1 }} />
                              ) : (
                                <VisibilityOffIcon sx={{ mr: 1 }} />
                              )}
                              {station.hidden ? "Unhide Station" : "Hide Station"}
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                setDeleteDialog({ open: true, station });
                                setOpenMenuStationId(null);
                              }}
                              disabled={deletingStationId === station.id}
                              sx={{ color: "danger.plainColor" }}
                            >
                              <DeleteIcon sx={{ mr: 1 }} />
                              Delete Station
                            </MenuItem>
                          </Menu>
                        </ClickAwayListener>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                // Desktop table layout
                <Box sx={{ overflowX: "auto" }}>
                  <Table sx={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "20%" }}>Name</th>
                        <th style={{ width: "20%" }}>Location</th>
                        <th style={{ width: "18%" }}>Owner</th>
                        <th style={{ width: "12%" }}>Status</th>
                        <th style={{ width: "10%" }}>Visibility</th>
                        <th style={{ width: "12%" }}>Created</th>
                        <th style={{ width: "8%" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stations.map((station: Station) => (
                        <tr key={station.id}>
                          <td style={{ width: "20%" }}>
                            <Typography level="body-sm" fontWeight="bold">
                              {station.name}
                            </Typography>
                          </td>
                          <td style={{ width: "20%" }}>
                            <Typography level="body-sm">
                              {station.location}
                            </Typography>
                          </td>
                          <td style={{ width: "18%" }}>
                            {station.user ? (
                              <Typography
                                level="body-sm"
                                sx={{
                                  cursor: "pointer",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                                onClick={() => navigate(`/admin/users/${station.user!.id}`)}
                              >
                                {station.user.display_name || station.user.username}
                              </Typography>
                            ) : (
                              <Typography level="body-sm" color="neutral">
                                No owner
                              </Typography>
                            )}
                          </td>
                          <td style={{ width: "12%" }}>
                            <Chip
                              size="sm"
                              color={station.is_online ? "success" : "danger"}
                              variant="soft"
                            >
                              {station.is_online ? "Online" : "Offline"}
                            </Chip>
                          </td>
                          <td style={{ width: "10%" }}>
                            <Chip
                              size="sm"
                              color={station.hidden ? "warning" : "success"}
                              variant="soft"
                            >
                              {station.hidden ? "Hidden" : "Visible"}
                            </Chip>
                          </td>
                          <td style={{ width: "12%" }}>
                            <Typography level="body-sm">
                              {new Date(station.created_at).toLocaleDateString("de-DE")}
                            </Typography>
                          </td>
                          <td style={{ width: "8%" }}>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="View Station Details">
                                <IconButton
                                  size="sm"
                                  variant="outlined"
                                  onClick={() => handleViewStationDetails(station.id)}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                              <IconButton
                                ref={(el) => {
                                  menuButtonRef.current[station.id] = el;
                                }}
                                size="sm"
                                variant="plain"
                                onClick={() =>
                                  setOpenMenuStationId(
                                    openMenuStationId === station.id ? null : station.id
                                  )
                                }
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Stack>

                            {/* Desktop menu */}
                            {!isMobile && openMenuStationId === station.id && (
                              <ClickAwayListener
                                onClickAway={() => setOpenMenuStationId(null)}
                                mouseEvent="onMouseDown"
                                touchEvent="onTouchStart"
                              >
                                <Menu
                                  anchorEl={menuButtonRef.current[station.id]}
                                  open={openMenuStationId === station.id}
                                  onClose={() => setOpenMenuStationId(null)}
                                  placement="bottom-end"
                                >
                                  <MenuItem
                                    onClick={() => {
                                      handleViewStationDetails(station.id);
                                      setOpenMenuStationId(null);
                                    }}
                                  >
                                    <ViewIcon sx={{ mr: 1 }} />
                                    View Details
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      handleHideStation(station.id, !station.hidden);
                                      setOpenMenuStationId(null);
                                    }}
                                    disabled={hidingStationId === station.id}
                                  >
                                    {station.hidden ? (
                                      <ViewIcon sx={{ mr: 1 }} />
                                    ) : (
                                      <VisibilityOffIcon sx={{ mr: 1 }} />
                                    )}
                                    {station.hidden ? "Unhide Station" : "Hide Station"}
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() => {
                                      setDeleteDialog({ open: true, station });
                                      setOpenMenuStationId(null);
                                    }}
                                    disabled={deletingStationId === station.id}
                                    sx={{ color: "danger.plainColor" }}
                                  >
                                    <DeleteIcon sx={{ mr: 1 }} />
                                    Delete Station
                                  </MenuItem>
                                </Menu>
                              </ClickAwayListener>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 3,
                mb: 2,
                gap: 1,
              }}
            >
              <Button
                variant="outlined"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </Button>
              <Typography sx={{ alignSelf: "center", mx: 2 }}>
                Page {pagination.page} of {pagination.pages}
              </Typography>
              <Button
                variant="outlined"
                disabled={pagination.page === pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </Box>
          )}

          {/* Results summary */}
          <Typography
            level="body-sm"
            color="neutral"
            sx={{ textAlign: "center", mb: 3 }}
          >
            Showing {stations.length} stations
            {searchQuery && ` matching "${searchQuery}"`}
          </Typography>
        </TabPanel>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, station: null })}
      >
        <ModalDialog>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>
            Confirm Station Deletion
          </Typography>
          <Typography sx={{ mb: 3 }}>
            Are you sure you want to delete the station "{deleteDialog.station?.name}"? This action cannot be undone.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setDeleteDialog({ open: false, station: null })}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={() =>
                deleteDialog.station && handleDeleteStation(deleteDialog.station.id)
              }
              disabled={deletingStationId !== null}
            >
              {deletingStationId ? 'Deleting...' : 'Delete Station'}
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminStationsMap;