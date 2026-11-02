"""Shared jobs errors helpers."""


class DownloadQueueFull(Exception):
    pass

class DownloadQueueTimeout(Exception):
    pass

class SpoolBudgetExceeded(Exception):
    pass

class DownloadRequestError(ValueError):
    pass
