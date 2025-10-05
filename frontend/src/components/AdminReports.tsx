import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Input,
  Select,
  Option,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Table,
  Modal,
  ModalDialog,
  ModalClose,
  IconButton,
  FormControl,
  FormLabel,
  Menu,
  MenuItem,
  ListItemDecorator,
} from "@mui/joy";
import { useMediaQuery, useTheme } from "@mui/material";
import {
  getReports,
  updateReportStatus,
  deleteReport,
  type Report,
  type ReportsResponse,
} from "../api";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Tooltip } from "@mui/joy";
import { useTranslation } from "../contexts/TranslationContext";

const AdminReports: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const { t, language, isLoading: translationsLoading } = useTranslation();
  const componentRef = useRef<HTMLDivElement>(null);
  const isMdUp = useMediaQuery('(min-width:900px)');
  const isSmUp = useMediaQuery('(min-width:600px)');

  // Filters - current filter values (what user is typing)
  const [currentFilters, setCurrentFilters] = useState({
    status: "",
    target_type: "",
    target_id: "",
    user_id: "",
    reporter_username: "",
  });

  // Applied filters - what is actually sent to API
  const [appliedFilters, setAppliedFilters] = useState({
    status: "",
    target_type: "",
    target_id: "",
    user_id: "",
    reporter_username: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(
    null
  );

  const fetchReports = async (filtersOverride?: typeof appliedFilters) => {
    try {
      setLoading(true);
      setError(null);

      const searchFilters = filtersOverride || appliedFilters;
      const response: ReportsResponse = await getReports(page, limit, searchFilters);
      setReports(response.reports);
      setTotalPages(response.pagination.pages);
      setTotal(response.pagination.total);
    } catch (err) {
      setError(t("admin.reports.errorLoading"));
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page]);

  const handleSearch = () => {
    setAppliedFilters(currentFilters);
    setPage(1);
    fetchReports(currentFilters);
  };

  // Check for reportId URL parameter and open details modal
  useEffect(() => {
    const reportId = searchParams.get("reportId");
    if (reportId && reports.length > 0 && !loading) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        setSelectedReport(report);
        setDetailsOpen(true);
        // Clear the URL parameter after opening the modal
        setSearchParams(new URLSearchParams());
      }
    }
  }, [reports, loading, searchParams, setSearchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close menu when clicking anywhere, but not on the menu button or menu itself
      const target = event.target as Element;
      const isMenuButton = target.closest("[data-menu-button]");
      const isMenu = target.closest('[role="menu"]');

      if (!isMenuButton && !isMenu) {
        handleActionMenuClose();
      }
    };

    if (actionMenuOpen !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [actionMenuOpen]);

  const handleFilterChange = (field: string, value: string) => {
    setCurrentFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    const emptyFilters = {
      status: "",
      target_type: "",
      target_id: "",
      user_id: "",
      reporter_username: "",
    };
    setCurrentFilters(emptyFilters); // Clear input fields visually
    setAppliedFilters(emptyFilters);
    setPage(1);
    fetchReports(emptyFilters); // Reload table immediately with cleared filters
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "reviewed":
        return "primary";
      case "resolved":
        return "success";
      case "dismissed":
        return "danger";
      default:
        return "neutral";
    }
  };

  const getTargetTypeColor = (targetType: string) => {
    switch (targetType) {
      case "post":
        return "primary";
      case "station":
        return "success";
      case "user":
        return "warning";
      case "comment":
        return "neutral";
      default:
        return "neutral";
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatTargetType = (targetType: string) => {
    return targetType.charAt(0).toUpperCase() + targetType.slice(1);
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setDetailsOpen(true);
  };

  const handleStatusUpdate = async (reportId: string, newStatus: string) => {
    try {
      await updateReportStatus(reportId, newStatus);
      // Refresh the reports list
      await fetchReports();
      setActionMenuOpen(null);
      setActionMenuAnchor(null);
    } catch (err) {
      setError(t("admin.reports.errorUpdating"));
      console.error("Error updating report status:", err);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm(t("admin.reports.confirmDelete"))) return;

    try {
      await deleteReport(reportId);
      // Refresh the reports list
      await fetchReports();
      setActionMenuOpen(null);
      setActionMenuAnchor(null);
    } catch (err) {
      setError(t("admin.reports.errorDeleting"));
      console.error("Error deleting report:", err);
    }
  };

  const handleActionMenuOpen = (reportId: string, event: React.MouseEvent) => {
    setActionMenuOpen(reportId);
    setActionMenuAnchor(event.currentTarget as HTMLElement);
  };

  const handleActionMenuClose = () => {
    setActionMenuOpen(null);
    setActionMenuAnchor(null);
  };

  const getLocaleFromLanguage = (lang: string) => {
    switch (lang) {
      case "de":
        return "de-DE";
      case "nl":
        return "nl-NL";
      case "en":
        return "en-US";
      default:
        return "en-US";
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(getLocaleFromLanguage(language));
  };

  // Don't render until translations are loaded
  if (translationsLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (loading && reports.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      ref={componentRef}
      sx={{ py: { xs: 1, md: 2 }, px: 0, maxWidth: "1400px", mx: "auto" }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography level="h2">{t("admin.reports.title")}</Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => setShowFilters(!showFilters)}>
            <FilterListIcon />
          </IconButton>
          <IconButton onClick={() => fetchReports()} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <Typography level="h4" sx={{ mb: 2 }}>
            {t("admin.reports.filters")}
          </Typography>
          <Stack
            spacing={2}
            direction={{ xs: "column", md: "row" }}
            sx={{ flexWrap: "wrap" }}
          >
            <FormControl size="sm" sx={{ minWidth: 150 }}>
              <FormLabel>{t("admin.reports.status")}</FormLabel>
              <Select
                value={currentFilters.status}
                onChange={(_, value) =>
                  handleFilterChange("status", value as string)
                }
              >
                <Option value="">{t("admin.reports.allStatuses")}</Option>
                <Option value="pending">
                  {t("admin.reports.statusPending")}
                </Option>
                <Option value="reviewed">
                  {t("admin.reports.statusReviewed")}
                </Option>
                <Option value="resolved">
                  {t("admin.reports.statusResolved")}
                </Option>
                <Option value="dismissed">
                  {t("admin.reports.statusDismissed")}
                </Option>
              </Select>
            </FormControl>

            <FormControl size="sm" sx={{ minWidth: 150 }}>
              <FormLabel>{t("admin.reports.targetType")}</FormLabel>
              <Select
                value={currentFilters.target_type}
                onChange={(_, value) =>
                  handleFilterChange("target_type", value as string)
                }
              >
                <Option value="">{t("admin.reports.allTypes")}</Option>
                <Option value="post">{t("admin.reports.typePost")}</Option>
                <Option value="station">
                  {t("admin.reports.typeStation")}
                </Option>
                <Option value="user">{t("admin.reports.typeUser")}</Option>
                <Option value="comment">
                  {t("admin.reports.typeComment")}
                </Option>
              </Select>
            </FormControl>

            <FormControl size="sm" sx={{ minWidth: 200 }}>
              <FormLabel>{t("admin.reports.targetId")}</FormLabel>
              <Input
                placeholder={t("admin.reports.targetIdPlaceholder")}
                value={currentFilters.target_id}
                onChange={(e) =>
                  handleFilterChange("target_id", e.target.value)
                }
              />
            </FormControl>

            <FormControl size="sm" sx={{ minWidth: 200 }}>
              <FormLabel>{t("admin.reports.userId")}</FormLabel>
              <Input
                placeholder={t("admin.reports.reporterUserId")}
                value={currentFilters.user_id}
                onChange={(e) => handleFilterChange("user_id", e.target.value)}
              />
            </FormControl>

            <FormControl size="sm" sx={{ minWidth: 200 }}>
              <FormLabel>{t("admin.reports.reporterUsername")}</FormLabel>
              <Input
                placeholder={t("admin.reports.reporterUsernamePlaceholder")}
                value={currentFilters.reporter_username}
                onChange={(e) => handleFilterChange("reporter_username", e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </FormControl>


            <Stack direction="row" spacing={1} sx={{ alignSelf: "flex-end" }}>
              <Button
                variant="solid"
                color="primary"
                onClick={handleSearch}
                size="sm"
              >
                {t("admin.reports.search")}
              </Button>
              <Button
                variant="outlined"
                color="neutral"
                onClick={clearFilters}
                startDecorator={<ClearIcon />}
                size="sm"
              >
                {t("admin.reports.clear")}
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}

      <Card>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography level="body-sm" color="neutral">
            {t("admin.reports.showingReports", {
              count: reports.length,
              total,
            })}
          </Typography>
          {loading && <CircularProgress size="sm" />}
        </Box>

        {isMobile ? (
          // Mobile card layout
          <Stack spacing={2}>
            {reports.map((report) => (
              <Card key={report.id} variant="outlined">
                <CardContent sx={{ p: 2, position: 'relative', pb: 5 }}>
                  <IconButton
                    size="sm"
                    data-menu-button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActionMenuOpen(report.id, e);
                    }}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                  <IconButton
                    size="sm"
                    onClick={() => handleViewDetails(report)}
                    sx={{ position: 'absolute', bottom: 8, right: 8 }}
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <Stack spacing={2}>
                    {/* Header with title and status */}
                    <Box>
                      <Typography level="body-lg" fontWeight="bold">
                        {report.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <Chip
                          size="sm"
                          color={getStatusColor(report.status)}
                          variant="soft"
                        >
                          {formatStatus(report.status)}
                        </Chip>
                        <Typography level="body-xs" color="neutral">
                          {formatDateTime(report.created_at)}
                        </Typography>
                      </Stack>
                    </Box>

                    {/* Reporter info */}
                    <Box>
                      <Typography level="body-sm">
                        <strong>{t("admin.reports.reporter")}:</strong>{' '}
                        {report.username ? (
                          <Link
                            to={`/admin/users/${report.user_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              component="span"
                              sx={{ cursor: "pointer", color: "primary.main" }}
                            >
                              {report.username}
                            </Typography>
                          </Link>
                        ) : (
                          <Typography component="span" fontFamily="monospace">
                            {report.user_id.slice(0, 8)}...
                          </Typography>
                        )}
                      </Typography>
                    </Box>

                    {/* Target info */}
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography level="body-sm">
                          <strong>{t("admin.reports.target")}:</strong>
                        </Typography>
                        <Chip
                          size="sm"
                          color={getTargetTypeColor(report.target_type)}
                          variant="soft"
                        >
                          {formatTargetType(report.target_type)}
                        </Chip>
                        {report.target_type === "station" ? (
                          <Link
                            to={`/station/${report.target_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              level="body-sm"
                              sx={{ cursor: "pointer", color: "primary.main" }}
                              fontFamily="monospace"
                            >
                              {report.target_id.slice(0, 8)}...
                            </Typography>
                          </Link>
                        ) : report.target_type === "user" ? (
                          <Link
                            to={`/admin/users/${report.target_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              level="body-sm"
                              sx={{ cursor: "pointer", color: "primary.main" }}
                              fontFamily="monospace"
                            >
                              {report.target_id.slice(0, 8)}...
                            </Typography>
                          </Link>
                        ) : report.target_type === "post" ? (
                          <Link
                            to={`/post/${report.target_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              level="body-sm"
                              sx={{ cursor: "pointer", color: "primary.main" }}
                              fontFamily="monospace"
                            >
                              {report.target_id.slice(0, 8)}...
                            </Typography>
                          </Link>
                        ) : report.target_type === "comment" ? (
                          <Link
                            to={`/post/${report.target_post_id}#comment-${report.target_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              level="body-sm"
                              sx={{ cursor: "pointer", color: "primary.main" }}
                              fontFamily="monospace"
                            >
                              {report.target_id.slice(0, 8)}...
                            </Typography>
                          </Link>
                        ) : (
                          <Typography level="body-sm" fontFamily="monospace">
                            {report.target_id.slice(0, 8)}...
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {reports.length === 0 && !loading && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="neutral">
                  {t("admin.reports.noReports")}
                </Typography>
              </Box>
            )}
          </Stack>
        ) : (
          // Desktop table layout
          <Box sx={{ overflowX: 'auto' }}>
            <Table stickyHeader>
              <thead>
                <tr>
                  {isMdUp && <th>{t("admin.reports.created")}</th>}
                  <th>{t("admin.reports.reporter")}</th>
                  {isSmUp && <th>{t("admin.reports.target")}</th>}
                  <th>{t("admin.reports.title_field")}</th>
                  <th>{t("admin.reports.status")}</th>
                  <th>{t("admin.reports.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id}>
                    {isMdUp && <td>{formatDateTime(report.created_at)}</td>}
                    <td>
                      {report.username ? (
                        <Link
                          to={`/admin/users/${report.user_id}`}
                          style={{ textDecoration: "none" }}
                        >
                          <Typography
                            sx={{ cursor: "pointer", color: "primary.main" }}
                          >
                            {report.username}
                          </Typography>
                        </Link>
                      ) : (
                        <Typography fontFamily="monospace">
                          {report.user_id.slice(0, 8)}...
                        </Typography>
                      )}
                    </td>
                    {isSmUp && <td>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="sm"
                          color={getTargetTypeColor(report.target_type)}
                          variant="soft"
                        >
                          {formatTargetType(report.target_type)}
                        </Chip>
                        {report.target_type === "station" ? (
                          <Link
                            to={`/station/${report.target_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              sx={{ cursor: "pointer", color: "primary.main" }}
                              fontFamily="monospace"
                            >
                              {report.target_id.slice(0, 8)}...
                            </Typography>
                          </Link>
                        ) : report.target_type === "user" ? (
                          <Link
                            to={`/admin/users/${report.target_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              sx={{ cursor: "pointer", color: "primary.main" }}
                              fontFamily="monospace"
                            >
                              {report.target_id.slice(0, 8)}...
                            </Typography>
                          </Link>
                        ) : report.target_type === "post" ? (
                          <Link
                            to={`/post/${report.target_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              sx={{ cursor: "pointer", color: "primary.main" }}
                              fontFamily="monospace"
                            >
                              {report.target_id.slice(0, 8)}...
                            </Typography>
                          </Link>
                        ) : report.target_type === "comment" ? (
                          <Link
                            to={`/post/${report.target_post_id}#comment-${report.target_id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Typography
                              sx={{ cursor: "pointer", color: "primary.main" }}
                              fontFamily="monospace"
                            >
                              {report.target_id.slice(0, 8)}...
                            </Typography>
                          </Link>
                        ) : (
                          <Typography fontFamily="monospace">
                            {report.target_id.slice(0, 8)}...
                          </Typography>
                        )}
                      </Stack>
                    </td>}
                    <td style={{ maxWidth: 300 }}>
                      <Typography
                        level="body-sm"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {report.title}
                      </Typography>
                    </td>
                    <td>
                      <Chip
                        size="sm"
                        color={getStatusColor(report.status)}
                        variant="soft"
                      >
                        {formatStatus(report.status)}
                      </Chip>
                    </td>
                    <td>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title={t("admin.reports.view")}>
                          <IconButton
                            size="sm"
                            variant="outlined"
                            onClick={() => handleViewDetails(report)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="sm"
                          data-menu-button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionMenuOpen(report.id, e);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Stack>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={isMdUp ? 6 : isSmUp ? 5 : 4}
                      style={{ textAlign: "center", padding: "2rem" }}
                    >
                      <Typography color="neutral">
                        {t("admin.reports.noReports")}
                      </Typography>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Box>
        )}

        {totalPages > 1 && (
          <Box
            sx={{ display: "flex", justifyContent: "center", mt: 3, gap: 1 }}
          >
            <Button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              size="sm"
            >
              {t("admin.reports.previous")}
            </Button>
            <Typography level="body-sm" sx={{ alignSelf: "center" }}>
              {t("admin.reports.pageOf", { page, total: totalPages })}
            </Typography>
            <Button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              size="sm"
            >
              {t("admin.reports.next")}
            </Button>
          </Box>
        )}
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={actionMenuOpen !== null}
        onClose={handleActionMenuClose}
        onClick={(e) => e.stopPropagation()}
        size="sm"
      >
        <MenuItem
          onClick={() => handleStatusUpdate(actionMenuOpen || "", "reviewed")}
        >
          <ListItemDecorator>
            <CheckCircleIcon />
          </ListItemDecorator>
          {t("admin.reports.markAsReviewed")}
        </MenuItem>
        <MenuItem
          onClick={() => handleStatusUpdate(actionMenuOpen || "", "resolved")}
        >
          <ListItemDecorator>
            <CheckCircleIcon />
          </ListItemDecorator>
          {t("admin.reports.markAsResolved")}
        </MenuItem>
        <MenuItem
          onClick={() => handleStatusUpdate(actionMenuOpen || "", "dismissed")}
        >
          <ListItemDecorator>
            <CancelIcon />
          </ListItemDecorator>
          {t("admin.reports.dismissReport")}
        </MenuItem>
        <MenuItem
          onClick={() => handleDeleteReport(actionMenuOpen || "")}
          color="danger"
        >
          <ListItemDecorator>
            <DeleteIcon />
          </ListItemDecorator>
          {t("admin.reports.deleteReport")}
        </MenuItem>
      </Menu>

      {/* Details Modal */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <ModalDialog>
          <ModalClose />
          <Typography level="h4">{t("admin.reports.reportDetails")}</Typography>
          {selectedReport && (
            <Stack spacing={2}>
              <Box>
                <Typography level="body-sm" color="neutral">
                  {t("admin.reports.reportId")}
                </Typography>
                <Typography fontFamily="monospace">
                  {selectedReport.id}
                </Typography>
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  {t("admin.reports.created")}
                </Typography>
                <Typography>
                  {formatDateTime(selectedReport.created_at)}
                </Typography>
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  {t("admin.reports.reporter")}
                </Typography>
                {selectedReport.username ? (
                  <Link
                    to={`/admin/users/${selectedReport.user_id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      sx={{ cursor: "pointer", color: "primary.main" }}
                    >
                      {selectedReport.username} ({selectedReport.user_id})
                    </Typography>
                  </Link>
                ) : (
                  <Typography fontFamily="monospace">
                    {selectedReport.user_id}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  {t("admin.reports.target")}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    color={getTargetTypeColor(selectedReport.target_type)}
                    variant="soft"
                  >
                    {formatTargetType(selectedReport.target_type)}
                  </Chip>
                  {selectedReport.target_type === "station" ? (
                    <Link
                      to={`/station/${selectedReport.target_id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Typography
                        sx={{ cursor: "pointer", color: "primary.main" }}
                        fontFamily="monospace"
                      >
                        {selectedReport.target_id}
                      </Typography>
                    </Link>
                  ) : selectedReport.target_type === "user" ? (
                    <Link
                      to={`/admin/users/${selectedReport.target_id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Typography
                        sx={{ cursor: "pointer", color: "primary.main" }}
                        fontFamily="monospace"
                      >
                        {selectedReport.target_id}
                      </Typography>
                    </Link>
                  ) : (
                    <Typography fontFamily="monospace">
                      {selectedReport.target_id}
                    </Typography>
                  )}
                </Stack>
              </Box>

              {selectedReport.target_owner_username && (
                <Box>
                  <Typography level="body-sm" color="neutral">
                    {t("admin.reports.targetOwner")}
                  </Typography>
                  <Link
                    to={`/admin/users/${selectedReport.target_owner_id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      sx={{ cursor: "pointer", color: "primary.main" }}
                    >
                      {selectedReport.target_owner_display_name ||
                        selectedReport.target_owner_username}
                      {selectedReport.target_owner_display_name &&
                        selectedReport.target_owner_display_name !==
                          selectedReport.target_owner_username && (
                          <Typography
                            component="span"
                            fontFamily="monospace"
                            sx={{ ml: 1, color: "text.secondary" }}
                          >
                            ({selectedReport.target_owner_username})
                          </Typography>
                        )}
                    </Typography>
                  </Link>
                </Box>
              )}

              <Box>
                <Typography level="body-sm" color="neutral">
                  {t("admin.reports.title_field")}
                </Typography>
                <Typography>{selectedReport.title}</Typography>
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  {t("admin.reports.reportContent")}
                </Typography>
                <Box
                  sx={{
                    backgroundColor: "background.level1",
                    p: 2,
                    borderRadius: 1,
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  <Typography sx={{ whiteSpace: "pre-wrap" }}>
                    {selectedReport.message}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography level="body-sm" color="neutral">
                  {t("admin.reports.status")}
                </Typography>
                <Chip
                  color={getStatusColor(selectedReport.status)}
                  variant="soft"
                >
                  {formatStatus(selectedReport.status)}
                </Chip>
              </Box>

              {selectedReport.reviewed_by && (
                <Box>
                  <Typography level="body-sm" color="neutral">
                    {t("admin.reports.reviewedBy")}
                  </Typography>
                  <Typography fontFamily="monospace">
                    {selectedReport.reviewed_by}
                  </Typography>
                </Box>
              )}

              {selectedReport.reviewed_at && (
                <Box>
                  <Typography level="body-sm" color="neutral">
                    {t("admin.reports.reviewedAt")}
                  </Typography>
                  <Typography>
                    {formatDateTime(selectedReport.reviewed_at)}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default AdminReports;
