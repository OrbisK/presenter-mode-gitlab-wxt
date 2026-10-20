# Presenter Mode for GitLab

> This extension is not affiliated with, endorsed by, or sponsored by GitLab Inc.

A browser extension that makes GitLab safe to screenshare. While presenter mode is on, it hides:

- **internal notes**, and
- **every thread that contains one** — including its reply toggle, reply box and card frame.

A red **Presenter mode** pill at the bottom of the page and an **ON** badge on the toolbar icon show
that it is active.

## Usage

| Action | How |
| --- | --- |
| Toggle presenter mode | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd>, or the toolbar popup |
| Turn it off | Click the pill at the bottom of the page |
| Change the shortcut | `chrome://extensions/shortcuts` (Chrome) / `about:addons` → ⚙ → *Manage Extension Shortcuts* (Firefox) |

The state is global: toggling it applies to every open GitLab tab and survives reloads.

## Install

Download the zip for your browser from the [latest release](../../releases/latest).

- **Chrome:** unzip, open `chrome://extensions`, enable *Developer mode*, *Load unpacked* → the unzipped folder.
- **Firefox:** open `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on…* → the zip.
  Firefox treats MV3 host permissions as optional, so grant access to `gitlab.com` from the
  extension's menu in the toolbar if presenter mode does nothing there.

## GitLab instances

`gitlab.com` is always enabled. For a self-managed instance, open any page on it, click the toolbar
icon and choose **Enable on this instance** — or add it under **Manage instances** (the options
page). The extension asks for access to that one origin only, and runs nowhere else.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and releasing.
